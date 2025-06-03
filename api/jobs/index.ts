import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertJobSchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as string;

      let jobs;
      if (source) {
        // Assuming getJobsBySource exists and works similarly
        // NOTE: Check if storage.getJobsBySource needs limit/offset too
        jobs = await storage.getJobsBySource(source, limit, offset); 
      } else {
        jobs = await storage.getJobs(limit, offset);
      }

      return res.status(200).json(jobs);
    } catch (error) {
      logger.error("Failed to get jobs", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve jobs" });
    }
  }

  // Handle POST request
  if (req.method === "POST") {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      
      // Log activity (optional, but good practice)
      try {
          await storage.createActivity({
            type: "job_collected",
            description: `New job collected: ${job.title}`,
            source: job.source,
            result: `Job ID: ${job.id}`,
            status: "success",
            metadata: { jobId: job.id }
          });
      } catch (activityError) {
          logger.error("Failed to log job creation activity", { activityError, jobId: job.id });
          // Continue even if logging fails
      }
      
      return res.status(201).json(job);
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid job data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid job data", errors: (error as any).errors });
      }
      logger.error("Failed to create job", { error, body: req.body });
      return res.status(500).json({ message: "Failed to create job" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

