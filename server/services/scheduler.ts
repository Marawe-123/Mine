import { storage } from "../storage";
import { logger } from "./logger";
import { jobScraper } from "./jobScraper";
import { commentAnalyzer } from "./commentAnalyzer";
import { autoReplyService } from "./autoReply";

interface ScheduledTask {
  id: string;
  name: string;
  type: string;
  schedule: string; // cron expression
  config: any;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class SchedulerService {
  private isRunning = false;
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultTasks();
  }

  start(): void {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Scheduler started");

    // Start all active scheduled tasks
    for (const task of this.scheduledTasks.values()) {
      if (task.isActive) {
        this.scheduleTask(task);
      }
    }

    // Start main scheduler loop (runs every minute to check for tasks)
    const mainInterval = setInterval(() => {
      this.checkScheduledTasks();
    }, 60000); // Check every minute

    this.intervals.set("main", mainInterval);
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn("Scheduler is not running");
      return;
    }

    this.isRunning = false;
    logger.info("Scheduler stopped");

    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  private initializeDefaultTasks(): void {
    const defaultTasks: ScheduledTask[] = [
      {
        id: "facebook_jobs_collection",
        name: "Facebook Jobs Collection",
        type: "job_collection",
        schedule: "*/30 * * * *", // Every 30 minutes
        config: {
          source: "facebook",
          sourceUrl: "https://facebook.com/groups/jobsriyadh",
          maxJobs: 50
        },
        isActive: true
      },
      {
        id: "linkedin_jobs_collection",
        name: "LinkedIn Jobs Collection",
        type: "job_collection",
        schedule: "0 */2 * * *", // Every 2 hours
        config: {
          source: "linkedin",
          maxJobs: 30
        },
        isActive: true
      },
      {
        id: "comment_analysis",
        name: "Automated Comment Analysis",
        type: "comment_analysis",
        schedule: "*/15 * * * *", // Every 15 minutes
        config: {},
        isActive: true
      },
      {
        id: "auto_reply_sender",
        name: "Auto Reply Sender",
        type: "auto_reply",
        schedule: "*/10 * * * *", // Every 10 minutes
        config: {},
        isActive: true
      }
    ];

    defaultTasks.forEach(task => {
      this.scheduledTasks.set(task.id, task);
    });
  }

  private scheduleTask(task: ScheduledTask): void {
    // Parse cron expression to get interval in milliseconds
    const intervalMs = this.cronToInterval(task.schedule);
    
    if (intervalMs) {
      const interval = setInterval(() => {
        this.executeTask(task);
      }, intervalMs);

      this.intervals.set(task.id, interval);
      
      // Calculate next run time
      task.nextRun = new Date(Date.now() + intervalMs);
      
      logger.info("Task scheduled", { 
        taskId: task.id, 
        name: task.name, 
        intervalMs,
        nextRun: task.nextRun 
      });
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    if (!this.isRunning) return;

    try {
      logger.info("Executing scheduled task", { taskId: task.id, name: task.name });

      // Update last run time
      task.lastRun = new Date();

      // Create a task record
      const taskRecord = await storage.createTask({
        name: `Scheduled: ${task.name}`,
        type: task.type,
        status: "pending",
        config: task.config
      });

      // Execute based on task type
      switch (task.type) {
        case "job_collection":
          await this.executeJobCollection(taskRecord.id, task.config);
          break;
        case "comment_analysis":
          await this.executeCommentAnalysis(taskRecord.id, task.config);
          break;
        case "auto_reply":
          await this.executeAutoReply(taskRecord.id, task.config);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      await storage.createActivity({
        type: "scheduled_task_completed",
        description: `Scheduled task completed: ${task.name}`,
        source: "scheduler",
        result: "Success",
        status: "success",
        metadata: { scheduledTaskId: task.id, taskRecordId: taskRecord.id }
      });

    } catch (error) {
      logger.error("Scheduled task failed", { error, taskId: task.id, name: task.name });

      await storage.createActivity({
        type: "error",
        description: `Scheduled task failed: ${task.name}`,
        source: "scheduler",
        result: "Failed",
        status: "error",
        metadata: { 
          scheduledTaskId: task.id, 
          error: error instanceof Error ? error.message : "Unknown error" 
        }
      });
    }
  }

  private async executeJobCollection(taskId: number, config: any): Promise<void> {
    if (jobScraper.isCollectionRunning()) {
      logger.warn("Job collection already running, skipping scheduled task");
      await storage.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: { message: "Skipped - job collection already running" }
      });
      return;
    }

    await jobScraper.startCollection(
      taskId,
      config.source,
      config.sourceUrl,
      { maxJobs: config.maxJobs }
    );
  }

  private async executeCommentAnalysis(taskId: number, config: any): Promise<void> {
    if (commentAnalyzer.isAnalysisRunning()) {
      logger.warn("Comment analysis already running, skipping scheduled task");
      await storage.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: { message: "Skipped - comment analysis already running" }
      });
      return;
    }

    await commentAnalyzer.analyzeComments(taskId, config.jobId);
  }

  private async executeAutoReply(taskId: number, config: any): Promise<void> {
    if (autoReplyService.isReplyServiceRunning()) {
      logger.warn("Auto reply service already running, skipping scheduled task");
      await storage.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: { message: "Skipped - auto reply service already running" }
      });
      return;
    }

    await autoReplyService.sendPendingReplies(taskId);
  }

  private checkScheduledTasks(): void {
    if (!this.isRunning) return;

    // This method could be used for more complex scheduling logic
    // For now, we rely on setInterval for simplicity
    logger.debug("Checking scheduled tasks");
  }

  private cronToInterval(cronExpression: string): number | null {
    // Simple cron parser for basic expressions
    // This is a simplified implementation - in production, use a proper cron library
    
    if (cronExpression === "*/30 * * * *") return 30 * 60 * 1000; // 30 minutes
    if (cronExpression === "0 */2 * * *") return 2 * 60 * 60 * 1000; // 2 hours
    if (cronExpression === "*/15 * * * *") return 15 * 60 * 1000; // 15 minutes
    if (cronExpression === "*/10 * * * *") return 10 * 60 * 1000; // 10 minutes
    if (cronExpression === "*/5 * * * *") return 5 * 60 * 1000; // 5 minutes
    
    // Default to 1 hour if can't parse
    logger.warn("Could not parse cron expression, defaulting to 1 hour", { cronExpression });
    return 60 * 60 * 1000;
  }

  // Public methods for managing scheduled tasks
  addTask(task: ScheduledTask): void {
    this.scheduledTasks.set(task.id, task);
    
    if (this.isRunning && task.isActive) {
      this.scheduleTask(task);
    }
    
    logger.info("Scheduled task added", { taskId: task.id, name: task.name });
  }

  removeTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    // Clear interval if running
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }

    this.scheduledTasks.delete(taskId);
    logger.info("Scheduled task removed", { taskId, name: task.name });
    return true;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

export const scheduler = new SchedulerService();
