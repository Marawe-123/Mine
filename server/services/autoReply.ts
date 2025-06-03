import { storage } from "../storage";
import { logger } from "./logger";

interface ReplyResult {
  success: boolean;
  error?: string;
}

class AutoReplyService {
  private isRunning = false;
  private replyDelay = { min: 60000, max: 300000 }; // 1-5 minutes

  async sendPendingReplies(taskId: number): Promise<void> {
    if (this.isRunning) {
      throw new Error("Auto reply service is already running");
    }

    this.isRunning = true;

    try {
      await storage.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0
      });

      logger.info("Starting auto reply process", { taskId });

      // Check if auto replies are enabled
      const autoReplyEnabled = await storage.getSettingByKey("auto_reply_enabled");
      if (!autoReplyEnabled || autoReplyEnabled.value !== "true") {
        await storage.updateTask(taskId, {
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          result: { message: "Auto replies are disabled" }
        });
        return;
      }

      // Get settings for reply delays
      await this.loadReplySettings();

      const pendingReplies = await storage.getPendingReplies();

      if (pendingReplies.length === 0) {
        await storage.updateTask(taskId, {
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          result: { repliesSent: 0, message: "No pending replies found" }
        });
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < pendingReplies.length; i++) {
        const reply = pendingReplies[i];

        try {
          // Add random delay between replies
          if (i > 0) {
            const delay = this.generateRandomDelay();
            await this.delay(delay);
          }

          const result = await this.sendReply(reply.id);
          
          if (result.success) {
            successCount++;
            await storage.updateReply(reply.id, {
              status: "sent",
              sentAt: new Date()
            });

            // Update template usage count
            if (reply.templateUsed) {
              const templates = await storage.getReplyTemplates();
              const template = templates.find(t => t.name === reply.templateUsed);
              if (template) {
                await storage.updateReplyTemplate(template.id, {
                  usageCount: template.usageCount + 1
                });
              }
            }

            logger.info("Reply sent successfully", { replyId: reply.id });
          } else {
            failureCount++;
            await storage.updateReply(reply.id, {
              status: "failed",
              errorMessage: result.error
            });

            logger.error("Failed to send reply", { replyId: reply.id, error: result.error });
          }

          // Update progress
          const progress = Math.floor((i + 1) / pendingReplies.length * 100);
          await storage.updateTask(taskId, { progress });

        } catch (error) {
          failureCount++;
          await storage.updateReply(reply.id, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error"
          });

          logger.error("Error processing reply", { error, replyId: reply.id });
        }
      }

      await storage.updateTask(taskId, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        result: {
          repliesSent: successCount,
          repliesFailed: failureCount,
          totalProcessed: pendingReplies.length
        }
      });

      await storage.createActivity({
        type: "reply_sent",
        description: `Sent ${successCount} replies, ${failureCount} failed`,
        source: "auto_reply_service",
        result: `${successCount} replies sent`,
        status: successCount > 0 ? "success" : "warning",
        metadata: { taskId, successCount, failureCount }
      });

      logger.info("Auto reply process completed", {
        taskId,
        repliesSent: successCount,
        repliesFailed: failureCount
      });

    } catch (error) {
      await storage.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });

      await storage.createActivity({
        type: "error",
        description: "Auto reply process failed",
        source: "auto_reply_service",
        result: "Failed",
        status: "error",
        metadata: { taskId, error: error instanceof Error ? error.message : "Unknown error" }
      });

      logger.error("Auto reply process failed", { error, taskId });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async sendReply(replyId: number): Promise<ReplyResult> {
    try {
      const reply = await storage.getReplyById(replyId);
      if (!reply) {
        return { success: false, error: "Reply not found" };
      }

      const comment = await storage.getCommentById(reply.commentId);
      if (!comment) {
        return { success: false, error: "Associated comment not found" };
      }

      // In a real implementation, this would integrate with social media APIs
      // to actually post the reply. For now, we'll simulate the process.
      
      // Simulate API call delay
      await this.delay(1000 + Math.random() * 2000);

      // Simulate success/failure (95% success rate for demo)
      const success = Math.random() > 0.05;

      if (success) {
        logger.info("Reply sent via API", {
          replyId,
          commentId: comment.id,
          source: comment.source,
          content: reply.content.substring(0, 50) + "..."
        });

        return { success: true };
      } else {
        return { success: false, error: "API rate limit exceeded" };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private async loadReplySettings(): Promise<void> {
    try {
      const minDelaySetting = await storage.getSettingByKey("reply_delay_min");
      const maxDelaySetting = await storage.getSettingByKey("reply_delay_max");

      if (minDelaySetting) {
        this.replyDelay.min = parseInt(minDelaySetting.value);
      }

      if (maxDelaySetting) {
        this.replyDelay.max = parseInt(maxDelaySetting.value);
      }
    } catch (error) {
      logger.warn("Failed to load reply settings, using defaults", { error });
    }
  }

  private generateRandomDelay(): number {
    return Math.floor(
      Math.random() * (this.replyDelay.max - this.replyDelay.min) + this.replyDelay.min
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isReplyServiceRunning(): boolean {
    return this.isRunning;
  }

  async createAutoReply(commentId: number, templateName?: string): Promise<void> {
    try {
      const comment = await storage.getCommentById(commentId);
      if (!comment || !comment.isJobSeeker) {
        return; // Only create replies for job seekers
      }

      // Check if reply already exists
      const existingReplies = await storage.getReplies(commentId);
      if (existingReplies.length > 0) {
        return; // Reply already exists
      }

      // Get appropriate template
      let template;
      if (templateName) {
        const templates = await storage.getReplyTemplates();
        template = templates.find(t => t.name === templateName);
      } else {
        const templates = await storage.getReplyTemplates("job_invitation");
        template = templates[0]; // Use first available template
      }

      if (!template) {
        logger.warn("No reply template found", { commentId, templateName });
        return;
      }

      // Create the reply
      await storage.createReply({
        commentId,
        content: template.content,
        templateUsed: template.name,
        status: "pending"
      });

      logger.info("Auto reply created", { commentId, templateUsed: template.name });

    } catch (error) {
      logger.error("Failed to create auto reply", { error, commentId });
    }
  }
}

export const autoReplyService = new AutoReplyService();
