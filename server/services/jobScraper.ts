import { storage } from "../storage";
import { logger } from "./logger";
import type { InsertJob } from "@shared/schema";

interface ScrapingConfig {
  maxJobs?: number;
  keywords?: string[];
  minDate?: Date;
}

class JobScraperService {
  private isRunning = false;

  async startCollection(taskId: number, source: string, sourceUrl?: string, config: ScrapingConfig = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error("Job collection is already running");
    }

    this.isRunning = true;
    
    try {
      await storage.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0
      });

      logger.info("Starting job collection", { taskId, source, sourceUrl });

      let jobs: InsertJob[] = [];

      switch (source.toLowerCase()) {
        case 'facebook':
          jobs = await this.scrapeFacebook(sourceUrl, config);
          break;
        case 'linkedin':
          jobs = await this.scrapeLinkedIn(sourceUrl, config);
          break;
        case 'indeed':
          jobs = await this.scrapeIndeed(sourceUrl, config);
          break;
        default:
          throw new Error(`Unsupported source: ${source}`);
      }

      await storage.updateTask(taskId, { progress: 50 });

      // Save jobs to storage
      const savedJobs = [];
      for (let i = 0; i < jobs.length; i++) {
        try {
          const job = await storage.createJob(jobs[i]);
          savedJobs.push(job);
          
          // Update progress
          const progress = 50 + Math.floor((i + 1) / jobs.length * 50);
          await storage.updateTask(taskId, { progress });
          
          logger.info("Job saved", { jobId: job.id, title: job.title });
        } catch (error) {
          logger.error("Failed to save job", { error, job: jobs[i] });
        }
      }

      await storage.updateTask(taskId, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        result: { 
          jobsCollected: savedJobs.length,
          source,
          sourceUrl
        }
      });

      await storage.createActivity({
        type: "job_collected",
        description: `Collected ${savedJobs.length} jobs from ${source}`,
        source,
        result: `${savedJobs.length} jobs collected`,
        status: "success",
        metadata: { taskId, jobsCount: savedJobs.length }
      });

      logger.info("Job collection completed", { 
        taskId, 
        source, 
        jobsCollected: savedJobs.length 
      });

    } catch (error) {
      await storage.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });

      await storage.createActivity({
        type: "error",
        description: `Job collection failed for ${source}`,
        source,
        result: "Failed",
        status: "error",
        metadata: { taskId, error: error instanceof Error ? error.message : "Unknown error" }
      });

      logger.error("Job collection failed", { error, taskId, source });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async scrapeFacebook(sourceUrl?: string, config: ScrapingConfig = {}): Promise<InsertJob[]> {
    const { maxJobs = 20, keywords = [], minDate } = config;
    
    try {
      logger.info("Starting Facebook Graph API job collection", { sourceUrl, config });
      
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!appId || !appSecret) {
        throw new Error('Facebook API credentials not configured');
      }

      // Get access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to get Facebook access token: ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Define Egyptian job groups and pages to search
      // const searchTargets = [
      //   'jobsegypt',
      //   'cairojobs', 
      //   'alexandriajobs',
      //   'wuzzuf',
      //   'jobsdb.egypt'
      // ];

      // --- Load search targets dynamically ---
      let searchTargets: string[] = [];
      try {
        const targetsSetting = await storage.getSettingByKey("facebook_search_targets");
        if (targetsSetting && targetsSetting.value) {
          searchTargets = JSON.parse(targetsSetting.value);
          if (!Array.isArray(searchTargets)) {
            logger.warn("Invalid format for facebook_search_targets setting, using default empty list.");
            searchTargets = [];
          }
        } else {
          logger.warn("facebook_search_targets setting not found, no targets to scrape.");
        }
      } catch (error) {
        logger.error("Failed to load facebook_search_targets setting", { error });
        searchTargets = [];
      }

      if (searchTargets.length === 0) {
        logger.info("No Facebook search targets configured. Skipping Facebook scraping.");
        return []; // No targets to search
      }
      logger.info("Using Facebook search targets:", searchTargets);
      // --- End dynamic loading ---

      const jobs: InsertJob[] = [];

      // Search each target for job posts
      for (const target of searchTargets) {
        try {
          // Search for posts with job keywords
          const searchUrl = `https://graph.facebook.com/v18.0/${target}/posts?access_token=${accessToken}&limit=${Math.ceil(maxJobs / searchTargets.length)}&fields=message,created_time,id,from`;
          
          const response = await fetch(searchUrl);
          
          if (!response.ok) {
            logger.warn(`Failed to fetch posts from ${target}: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.data && Array.isArray(data.data)) {
            for (const post of data.data) {
              // Check if post contains job-related content
              const message = post.message || '';
              const isJobPost = this.isJobPost(message);
              
              if (isJobPost) {
                const job = this.extractJobFromPost(post, target);
                if (job) {
                  jobs.push(job);
                }
              }
              
              if (jobs.length >= maxJobs) break;
            }
          }
          
          // Add delay between requests to respect rate limits
          await this.delay(1000);
          
        } catch (error) {
          logger.warn(`Error processing target ${target}:`, error.message);
          continue;
        }
      }

      // Filter by keywords if provided
      let filteredJobs = jobs;
      if (keywords.length > 0) {
        filteredJobs = jobs.filter(job => 
          keywords.some(keyword => 
            job.title.toLowerCase().includes(keyword.toLowerCase()) || 
            job.description.toLowerCase().includes(keyword.toLowerCase()) ||
            job.keywords?.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
      }

      // Filter by date if provided
      if (minDate) {
        filteredJobs = filteredJobs.filter(job => job.postedAt >= minDate);
      }

      // Limit results
      const limitedJobs = filteredJobs.slice(0, maxJobs);

      logger.info("Facebook Graph API collection completed", { 
        found: limitedJobs.length, 
        filtered: filteredJobs.length,
        total: jobs.length 
      });

      return limitedJobs;
    } catch (error) {
      logger.error("Facebook Graph API collection failed", { error: error.message, sourceUrl });
      throw error;
    }
  }

  private isJobPost(message: string): boolean {
    const jobKeywords = [
      'مطلوب', 'وظيفة', 'عمل', 'توظيف', 'فرصة عمل', 'متاح',
      'خبرة', 'راتب', 'دوام', 'شركة', 'مؤسسة', 'مكتب',
      'job', 'hiring', 'opportunity', 'position', 'vacancy',
      'required', 'needed', 'salary', 'company', 'employment'
    ];
    
    const lowerMessage = message.toLowerCase();
    return jobKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  private extractJobFromPost(post: any, sourceName: string): InsertJob | null {
    try {
      const message = post.message || '';
      const createdTime = new Date(post.created_time);
      
      // Extract basic job information using patterns
      const title = this.extractJobTitle(message);
      const company = this.extractCompany(message);
      const location = this.extractLocation(message);
      const keywords = this.extractKeywords(message);
      
      if (!title) {
        return null; // Skip if no title found
      }
      
      return {
        title,
        description: message.length > 500 ? message.substring(0, 500) + '...' : message,
        company: company || 'غير محدد',
        location: location || 'مصر',
        source: 'facebook',
        sourceUrl: `https://facebook.com/${post.id}`,
        sourceId: `facebook_${post.id}`,
        keywords,
        isActive: true,
        postedAt: createdTime,
        metadata: {
          sourceName,
          postId: post.id,
          fromName: post.from?.name || 'غير محدد'
        }
      };
    } catch (error) {
      logger.warn('Error extracting job from post:', error.message);
      return null;
    }
  }

  private extractJobTitle(text: string): string | null {
    // Look for patterns like "مطلوب [job title]" or "وظيفة [job title]"
    const patterns = [
      /مطلوب\s+([^.\n،]+)/i,
      /وظيفة\s+([^.\n،]+)/i,
      /فرصة عمل\s+([^.\n،]+)/i,
      /متاح\s+([^.\n،]+)/i,
      /hiring\s+([^.\n,]+)/i,
      /position:\s*([^.\n,]+)/i,
      /job:\s*([^.\n,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }
    
    // Fallback: use first line if it looks like a title
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length > 10 && firstLine.length < 100) {
      return firstLine;
    }
    
    return null;
  }

  private extractCompany(text: string): string | null {
    const patterns = [
      /شركة\s+([^.\n،]+)/i,
      /مؤسسة\s+([^.\n،]+)/i,
      /مكتب\s+([^.\n،]+)/i,
      /company:\s*([^.\n,]+)/i,
      /at\s+([A-Za-z\s]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 80);
      }
    }
    
    return null;
  }

  private extractLocation(text: string): string | null {
    const locations = [
      'القاهرة', 'الإسكندرية', 'الجيزة', 'المنصورة', 'طنطا', 'أسوان', 'الأقصر',
      'بورسعيد', 'السويس', 'الزقازيق', 'المنيا', 'أسيوط', 'قنا', 'سوهاج',
      'cairo', 'alexandria', 'giza', 'mansoura', 'tanta', 'aswan', 'luxor',
      'egypt', 'مصر'
    ];
    
    for (const location of locations) {
      if (text.toLowerCase().includes(location.toLowerCase())) {
        return location.includes('مصر') ? location : location + '، مصر';
      }
    }
    
    return null;
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const commonKeywords = [
      'react', 'node.js', 'javascript', 'python', 'php', 'java',
      'محاسبة', 'مبيعات', 'تسويق', 'موارد بشرية', 'تطوير',
      'مهندس', 'طبيب', 'مدرس', 'سائق', 'طباخ', 'نادل'
    ];
    
    const lowerText = text.toLowerCase();
    for (const keyword of commonKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }
    
    return keywords;
  }

  private async scrapeLinkedIn(sourceUrl?: string, config: ScrapingConfig = {}): Promise<InsertJob[]> {
    logger.info("Starting LinkedIn scraping", { sourceUrl });

    await this.delay(3000); // Simulate scraping time

    const mockJobs: InsertJob[] = [
      {
        title: "Senior Software Engineer",
        description: "We are looking for a Senior Software Engineer to join our team and work on cutting-edge projects.",
        company: "Tech Solutions KSA",
        location: "Riyadh, Saudi Arabia",
        source: "linkedin",
        sourceUrl: sourceUrl || "https://linkedin.com/jobs/view/12345678",
        sourceId: "linkedin_job_12345678",
        keywords: ["software engineer", "senior", "programming"],
        isActive: true,
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metadata: {
          salary: "15000-20000 SAR",
          jobType: "Full-time",
          experience: "5+ years"
        }
      }
    ];

    return mockJobs.slice(0, config.maxJobs || mockJobs.length);
  }

  private async scrapeIndeed(sourceUrl?: string, config: ScrapingConfig = {}): Promise<InsertJob[]> {
    logger.info("Starting Indeed scraping", { sourceUrl });

    await this.delay(2500); // Simulate scraping time

    const mockJobs: InsertJob[] = [
      {
        title: "Customer Service Representative",
        description: "Join our customer service team and help provide excellent support to our clients.",
        company: "Customer Care Co.",
        location: "Dammam, Saudi Arabia",
        source: "indeed",
        sourceUrl: sourceUrl || "https://indeed.com/viewjob?jk=abcd1234",
        sourceId: "indeed_job_abcd1234",
        keywords: ["customer service", "support", "representative"],
        isActive: true,
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metadata: {
          salary: "5000-7000 SAR",
          jobType: "Full-time",
          urgency: "Urgent"
        }
      }
    ];

    return mockJobs.slice(0, config.maxJobs || mockJobs.length);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isCollectionRunning(): boolean {
    return this.isRunning;
  }
}

export const jobScraper = new JobScraperService();
