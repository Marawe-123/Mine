import { storage } from "../storage";
import { logger } from "./logger";
import type { InsertComment } from "@shared/schema";

interface AnalysisResult {
  isJobSeeker: boolean;
  sentiment: string;
  keywords: string[];
  confidence: number;
}

class CommentAnalyzerService {
  private isRunning = false;
  // --- Keywords are now loaded dynamically ---

  // Helper function to load keywords from settings
  private async loadAnalysisKeywords(): Promise<{ jobSeekerKeywords: string[], sentimentKeywords: Record<string, string[]> }> {
    let jobSeekerKeywords: string[] = [];
    let sentimentKeywords: Record<string, string[]> = { positive: [], negative: [], neutral: [] };
    const defaultJobSeekerKeywords = [
      "أبحث عن عمل", "باحث عن وظيفة", "متوفر للعمل", "أرسل السيرة الذاتية",
      "خبرة في", "أريد وظيفة", "looking for job", "available for work",
      "send cv", "interested", "مهتم", "متاح", "يمكنني العمل"
    ];
    const defaultSentimentKeywords = {
      positive: ["ممتاز", "رائع", "مهتم", "شكرا", "interested", "great", "excellent"],
      negative: ["سيء", "صعب", "مستحيل", "bad", "difficult", "impossible"],
      neutral: ["أرسل", "معلومات", "تفاصيل", "send", "details", "information"]
    };

    try {
      const jobSeekerSetting = await storage.getSettingByKey("analysis_jobseeker_keywords");
      if (jobSeekerSetting && jobSeekerSetting.value) {
        jobSeekerKeywords = JSON.parse(jobSeekerSetting.value);
        if (!Array.isArray(jobSeekerKeywords)) jobSeekerKeywords = defaultJobSeekerKeywords;
      } else {
        jobSeekerKeywords = defaultJobSeekerKeywords; // Use default if not set
      }

      const positiveSetting = await storage.getSettingByKey("analysis_sentiment_positive");
      if (positiveSetting && positiveSetting.value) {
        sentimentKeywords.positive = JSON.parse(positiveSetting.value);
        if (!Array.isArray(sentimentKeywords.positive)) sentimentKeywords.positive = defaultSentimentKeywords.positive;
      } else {
         sentimentKeywords.positive = defaultSentimentKeywords.positive;
      }

      const negativeSetting = await storage.getSettingByKey("analysis_sentiment_negative");
      if (negativeSetting && negativeSetting.value) {
        sentimentKeywords.negative = JSON.parse(negativeSetting.value);
        if (!Array.isArray(sentimentKeywords.negative)) sentimentKeywords.negative = defaultSentimentKeywords.negative;
      } else {
        sentimentKeywords.negative = defaultSentimentKeywords.negative;
      }

      const neutralSetting = await storage.getSettingByKey("analysis_sentiment_neutral");
      if (neutralSetting && neutralSetting.value) {
        sentimentKeywords.neutral = JSON.parse(neutralSetting.value);
        if (!Array.isArray(sentimentKeywords.neutral)) sentimentKeywords.neutral = defaultSentimentKeywords.neutral;
      } else {
        sentimentKeywords.neutral = defaultSentimentKeywords.neutral;
      }

    } catch (error) {
      logger.error("Failed to load analysis keywords settings, using defaults.", { error });
      jobSeekerKeywords = defaultJobSeekerKeywords;
      sentimentKeywords = defaultSentimentKeywords;
    }
    return { jobSeekerKeywords, sentimentKeywords };
  }

  async analyzeComments(taskId: number, jobId?: number): Promise<void> {
    if (this.isRunning) {
      throw new Error("Comment analysis is already running");
    }

    this.isRunning = true;

    try {
      await storage.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0
      });

      logger.info("Starting comment analysis", { taskId, jobId });

      // Get comments to analyze
      const comments = await storage.getComments(jobId, 1000);
      const unanalyzedComments = comments.filter(comment => !comment.analyzedAt);

      if (unanalyzedComments.length === 0) {
        await storage.updateTask(taskId, {
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          result: { commentsAnalyzed: 0, message: "No unanalyzed comments found" }
        });
        logger.info("No unanalyzed comments found for analysis.", { taskId, jobId });
        this.isRunning = false;
        return;
      }

      let analyzedCount = 0;
      let jobSeekersFound = 0;

      for (let i = 0; i < unanalyzedComments.length; i++) {
        const comment = unanalyzedComments[i];
        
        try {
          // Analyze the comment using dynamically loaded keywords
          const analysis = await this.analyzeCommentContent(comment.content);
          
          await storage.updateComment(comment.id, {
            isJobSeeker: analysis.isJobSeeker,
            sentiment: analysis.sentiment,
            keywords: analysis.keywords,
            analyzedAt: new Date()
          });

          if (analysis.isJobSeeker) {
            jobSeekersFound++;
            
            // Create a pending reply for job seekers
            // Consider making the template category dynamic as well
            const templates = await storage.getReplyTemplates("job_invitation");
            if (templates.length > 0) {
              // Check if a reply already exists for this comment
              const existingReplies = await storage.getReplies(comment.id);
              if (existingReplies.length === 0) {
                  await storage.createReply({
                    commentId: comment.id,
                    content: templates[0].content, // Use the first template found
                    templateUsed: templates[0].name,
                    status: "pending"
                  });
              } else {
                  logger.info("Reply already exists for comment, skipping creation.", { commentId: comment.id });
              }
            } else {
                logger.warn("No 'job_invitation' reply template found for job seeker.", { commentId: comment.id });
            }
          }

          analyzedCount++;
          
          // Update progress
          const progress = Math.floor((i + 1) / unanalyzedComments.length * 100);
          await storage.updateTask(taskId, { progress });

          // Small delay to avoid overwhelming the system
          await this.delay(50); // Reduced delay slightly

        } catch (error) {
          logger.error("Failed to analyze comment", { error, commentId: comment.id });
        }
      }

      await storage.updateTask(taskId, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        result: {
          commentsAnalyzed: analyzedCount,
          jobSeekersFound,
          jobId
        }
      });

      await storage.createActivity({
        type: "comment_analyzed",
        description: `Analyzed ${analyzedCount} comments, found ${jobSeekersFound} job seekers`,
        source: jobId ? `Job ${jobId}` : "All Jobs",
        result: `${analyzedCount} comments analyzed`,
        status: "success",
        metadata: { taskId, commentsAnalyzed: analyzedCount, jobSeekersFound }
      });

      logger.info("Comment analysis completed", {
        taskId,
        commentsAnalyzed: analyzedCount,
        jobSeekersFound
      });

    } catch (error) {
      await storage.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });

      await storage.createActivity({
        type: "error",
        description: "Comment analysis failed",
        source: jobId ? `Job ${jobId}` : "All Jobs",
        result: "Failed",
        status: "error",
        metadata: { taskId, error: error instanceof Error ? error.message : "Unknown error" }
      });

      logger.error("Comment analysis failed", { error, taskId });
      // Do not re-throw the error here to allow the finally block to run
    } finally {
      this.isRunning = false;
    }
  }

  // Renamed original analyzeComment to analyzeCommentContent to avoid conflict
  private async analyzeCommentContent(content: string): Promise<AnalysisResult> {
    const { jobSeekerKeywords, sentimentKeywords } = await this.loadAnalysisKeywords();

    const normalizedContent = content.toLowerCase().trim();
    
    // Check if it's a job seeker
    const isJobSeeker = jobSeekerKeywords.some(keyword => 
      normalizedContent.includes(keyword.toLowerCase())
    );

    // Analyze sentiment
    let sentiment = "neutral";
    let maxScore = 0;

    for (const [sentimentType, keywords] of Object.entries(sentimentKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        // Use word boundary to avoid partial matches, handle Arabic characters
        const regex = new RegExp(`\\b${keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'giu');
        const matches = (normalizedContent.match(regex) || []).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        sentiment = sentimentType;
      }
    }

    // Extract keywords
    const keywords = this.extractKeywords(normalizedContent);

    // Calculate confidence
    const confidence = this.calculateConfidence(normalizedContent, isJobSeeker, sentiment, jobSeekerKeywords);

    return {
      isJobSeeker,
      sentiment,
      keywords,
      confidence
    };
  }

  private extractKeywords(content: string): string[] {
    // Improved keyword extraction: handle Arabic better, filter more common words
    const commonWords = new Set([
      "في", "من", "إلى", "على", "عن", "مع", "هذا", "هذه", "هو", "هي", "هم", "هن", "هنا", "هناك",
      "انا", "أنا", "انت", "أنت", "انتي", "أنتي", "انتم", "أنتم", "انتن", "أنتن",
      "كل", "بعض", "جميع", "نفس", "غير", "مثل", "اي", "أي", "ايه", "ايه", "اى", "اي",
      "يكون", "كان", "صارت", "صار", "اصبح", "أصبح", "تم",
      "the", "a", "an", "is", "am", "are", "was", "were", "be", "being", "been",
      "of", "in", "on", "at", "to", "for", "with", "by", "from", "about", "as",
      "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
      "my", "your", "his", "its", "our", "your", "their",
      "and", "or", "but", "so", "if", "then", "that", "this", "these", "those",
      "please", "thanks", "thank", "cv", "info", "details"
    ]);
    const words = content.split(/\s+|\p{P}/u) // Split by space or punctuation
      .map(word => word.toLowerCase().trim())
      .filter(word => word.length > 2 && !commonWords.has(word) && !/^\d+$/.test(word)); // Filter common, short, or numeric words

    // Return unique words, limited to 10
    return [...new Set(words)].slice(0, 10);
  }

  // Modified calculateConfidence to accept jobSeekerKeywords
  private calculateConfidence(content: string, isJobSeeker: boolean, sentiment: string, jobSeekerKeywords: string[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for job seeker detection
    if (isJobSeeker) {
      const matchCount = jobSeekerKeywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      confidence += Math.min(matchCount * 0.15, 0.3); // Adjusted weight
    }

    // Adjust based on content length
    if (content.length > 30) { // Reduced length threshold
      confidence += 0.1;
    }
    if (content.length > 100) {
        confidence += 0.05;
    }

    // Adjust based on sentiment clarity
    if (sentiment !== "neutral") {
      confidence += 0.1;
    }

    return parseFloat(Math.min(confidence, 0.95).toFixed(2)); // Limit to 0.95 and format
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isAnalysisRunning(): boolean {
    return this.isRunning;
  }

  // Keep analyzeNewComment if needed elsewhere, ensure it uses analyzeCommentContent
  async analyzeNewComment(comment: InsertComment): Promise<AnalysisResult> {
    return this.analyzeCommentContent(comment.content);
  }
}


export const commentAnalyzer = new CommentAnalyzerService();
