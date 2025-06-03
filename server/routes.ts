import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobSchema, insertCommentSchema, insertReplySchema, insertTaskSchema, insertActivitySchema, insertSettingSchema, insertReplyTemplateSchema } from "@shared/schema";
import { jobScraper } from "./services/jobScraper";
import { commentAnalyzer } from "./services/commentAnalyzer";
import { autoReplyService } from "./services/autoReply";
import { scheduler } from "./services/scheduler";
import { logger } from "./services/logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      logger.error("Failed to get stats", { error });
      res.status(500).json({ message: "Failed to get statistics" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as string;
      
      let jobs;
      if (source) {
        jobs = await storage.getJobsBySource(source);
      } else {
        jobs = await storage.getJobs(limit, offset);
      }
      
      res.json(jobs);
    } catch (error) {
      logger.error("Failed to get jobs", { error });
      res.status(500).json({ message: "Failed to retrieve jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJobById(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      logger.error("Failed to get job", { error, id: req.params.id });
      res.status(500).json({ message: "Failed to retrieve job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      
      await storage.createActivity({
        type: "job_collected",
        description: `New job collected: ${job.title}`,
        source: job.source,
        result: `Job ID: ${job.id}`,
        status: "success",
        metadata: { jobId: job.id }
      });
      
      res.status(201).json(job);
    } catch (error) {
      logger.error("Failed to create job", { error, body: req.body });
      res.status(400).json({ message: "Invalid job data" });
    }
  });

  // Comments routes
  app.get("/api/comments", async (req, res) => {
    try {
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const comments = await storage.getComments(jobId, limit);
      res.json(comments);
    } catch (error) {
      logger.error("Failed to get comments", { error });
      res.status(500).json({ message: "Failed to retrieve comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      logger.error("Failed to create comment", { error, body: req.body });
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  app.get("/api/comments/job-seekers", async (req, res) => {
    try {
      const comments = await storage.getJobSeekerComments();
      res.json(comments);
    } catch (error) {
      logger.error("Failed to get job seeker comments", { error });
      res.status(500).json({ message: "Failed to retrieve job seeker comments" });
    }
  });

  // Replies routes
  app.get("/api/replies", async (req, res) => {
    try {
      const commentId = req.query.commentId ? parseInt(req.query.commentId as string) : undefined;
      const replies = await storage.getReplies(commentId);
      res.json(replies);
    } catch (error) {
      logger.error("Failed to get replies", { error });
      res.status(500).json({ message: "Failed to retrieve replies" });
    }
  });

  app.post("/api/replies", async (req, res) => {
    try {
      const replyData = insertReplySchema.parse(req.body);
      const reply = await storage.createReply(replyData);
      res.status(201).json(reply);
    } catch (error) {
      logger.error("Failed to create reply", { error, body: req.body });
      res.status(400).json({ message: "Invalid reply data" });
    }
  });

  app.get("/api/replies/pending", async (req, res) => {
    try {
      const replies = await storage.getPendingReplies();
      res.json(replies);
    } catch (error) {
      logger.error("Failed to get pending replies", { error });
      res.status(500).json({ message: "Failed to retrieve pending replies" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const tasks = await storage.getTasks(status, limit);
      res.json(tasks);
    } catch (error) {
      logger.error("Failed to get tasks", { error });
      res.status(500).json({ message: "Failed to retrieve tasks" });
    }
  });

  app.get("/api/tasks/active", async (req, res) => {
    try {
      const tasks = await storage.getActiveTasks();
      res.json(tasks);
    } catch (error) {
      logger.error("Failed to get active tasks", { error });
      res.status(500).json({ message: "Failed to retrieve active tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      await storage.createActivity({
        type: "task_created",
        description: `New task created: ${task.name}`,
        source: task.source || "system",
        result: `Task ID: ${task.id}`,
        status: "success",
        metadata: { taskId: task.id, taskType: task.type }
      });
      
      res.status(201).json(task);
    } catch (error) {
      logger.error("Failed to create task", { error, body: req.body });
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Activities routes
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const activities = await storage.getActivities(limit, offset);
      res.json(activities);
    } catch (error) {
      logger.error("Failed to get activities", { error });
      res.status(500).json({ message: "Failed to retrieve activities" });
    }
  });

  app.get("/api/activities/recent", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const activities = await storage.getRecentActivities(hours);
      res.json(activities);
    } catch (error) {
      logger.error("Failed to get recent activities", { error });
      res.status(500).json({ message: "Failed to retrieve recent activities" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const category = req.query.category as string;
      const settings = await storage.getSettings(category);
      res.json(settings);
    } catch (error) {
      logger.error("Failed to get settings", { error });
      res.status(500).json({ message: "Failed to retrieve settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settingData = insertSettingSchema.parse(req.body);
      const setting = await storage.createOrUpdateSetting(settingData);
      res.json(setting);
    } catch (error) {
      logger.error("Failed to update setting", { error, body: req.body });
      res.status(400).json({ message: "Invalid setting data" });
    }
  });

  // Reply Templates routes
  app.get("/api/reply-templates", async (req, res) => {
    try {
      const category = req.query.category as string;
      const templates = await storage.getReplyTemplates(category);
      res.json(templates);
    } catch (error) {
      logger.error("Failed to get reply templates", { error });
      res.status(500).json({ message: "Failed to retrieve reply templates" });
    }
  });

  app.post("/api/reply-templates", async (req, res) => {
    try {
      const templateData = insertReplyTemplateSchema.parse(req.body);
      const template = await storage.createReplyTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      logger.error("Failed to create reply template", { error, body: req.body });
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  // Action routes
  app.post("/api/actions/start-job-collection", async (req, res) => {
    try {
      const { source, sourceUrl } = req.body;
      
      const task = await storage.createTask({
        name: `Job Collection - ${source}`,
        type: "job_collection",
        status: "pending",
        source: source,
        sourceUrl: sourceUrl,
        config: { source, sourceUrl }
      });

      // Start job collection asynchronously
      jobScraper.startCollection(task.id, source, sourceUrl).catch(error => {
        logger.error("Job collection failed", { error, taskId: task.id });
      });

      res.json({ message: "Job collection started", taskId: task.id });
    } catch (error) {
      logger.error("Failed to start job collection", { error, body: req.body });
      res.status(500).json({ message: "Failed to start job collection" });
    }
  });

  app.post("/api/actions/analyze-comments", async (req, res) => {
    try {
      const { jobId } = req.body;
      
      const task = await storage.createTask({
        name: `Comment Analysis ${jobId ? `- Job ${jobId}` : '- All Jobs'}`,
        type: "comment_analysis",
        status: "pending",
        config: { jobId }
      });

      // Start comment analysis asynchronously
      commentAnalyzer.analyzeComments(task.id, jobId).catch(error => {
        logger.error("Comment analysis failed", { error, taskId: task.id });
      });

      res.json({ message: "Comment analysis started", taskId: task.id });
    } catch (error) {
      logger.error("Failed to start comment analysis", { error, body: req.body });
      res.status(500).json({ message: "Failed to start comment analysis" });
    }
  });

  app.post("/api/actions/send-replies", async (req, res) => {
    try {
      const task = await storage.createTask({
        name: "Send Pending Replies",
        type: "auto_reply",
        status: "pending",
        config: {}
      });

      // Start auto reply asynchronously
      autoReplyService.sendPendingReplies(task.id).catch(error => {
        logger.error("Auto reply failed", { error, taskId: task.id });
      });

      res.json({ message: "Auto reply process started", taskId: task.id });
    } catch (error) {
      logger.error("Failed to start auto reply", { error });
      res.status(500).json({ message: "Failed to start auto reply process" });
    }
  });

  // Test Facebook API connection
  app.get("/api/test/facebook", async (req, res) => {
    try {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!appId || !appSecret) {
        return res.status(400).json({ 
          success: false, 
          message: 'Facebook API credentials not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.' 
        });
      }

      // Test getting access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return res.status(400).json({ 
          success: false, 
          message: `Failed to get Facebook access token: ${errorText}` 
        });
      }
      
      const tokenData = await tokenResponse.json();
      
      // Test a simple API call to verify the token works
      // Use the app endpoint instead of /me since we're using app access token
      const testResponse = await fetch(
        `https://graph.facebook.com/v18.0/${appId}?access_token=${tokenData.access_token}&fields=name,category`
      );
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        return res.status(400).json({ 
          success: false, 
          message: `Facebook API test call failed: ${errorText}` 
        });
      }

      const testData = await testResponse.json();
      
      res.json({ 
        success: true, 
        message: 'Facebook API connection successful',
        appInfo: testData
      });
      
    } catch (error) {
      logger.error("Facebook API test failed", { error });
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error occurred" 
      });
    }
  });

  // Scheduler control
  app.post("/api/scheduler/start", async (req, res) => {
    try {
      scheduler.start();
      await storage.createActivity({
        type: "scheduler_started",
        description: "Scheduler started manually",
        source: "system",
        result: "Success",
        status: "success"
      });
      res.json({ message: "Scheduler started" });
    } catch (error) {
      logger.error("Failed to start scheduler", { error });
      res.status(500).json({ message: "Failed to start scheduler" });
    }
  });

  app.post("/api/scheduler/stop", async (req, res) => {
    try {
      scheduler.stop();
      await storage.createActivity({
        type: "scheduler_stopped",
        description: "Scheduler stopped manually",
        source: "system",
        result: "Success",
        status: "success"
      });
      res.json({ message: "Scheduler stopped" });
    } catch (error) {
      logger.error("Failed to stop scheduler", { error });
      res.status(500).json({ message: "Failed to stop scheduler" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
