import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder
import { jobScraper } from "../../../server/services/jobScraper"; // Adjust path

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { source, sourceUrl } = req.body;

    if (!source || !sourceUrl) {
        return res.status(400).json({ message: "Missing source or sourceUrl in request body" });
    }

    // Create task entry first
    const task = await storage.createTask({
      name: `Job Collection - ${source}`,
      type: "job_collection",
      status: "pending",
      source: source,
      sourceUrl: sourceUrl,
      config: { source, sourceUrl }
    });

    // Log activity
    try {
        await storage.createActivity({
            type: "task_created",
            description: `Job collection task created: ${task.name}`,
            source: "system",
            result: `Task ID: ${task.id}`,
            status: "success",
            metadata: { taskId: task.id, taskType: task.type }
        });
    } catch (activityError) {
        logger.error("Failed to log job collection task creation activity", { activityError, taskId: task.id });
    }

    // Trigger the job collection asynchronously (fire and forget in serverless)
    // Note: Long-running tasks might timeout in serverless. Consider background jobs/queues for robustness.
    jobScraper.startCollection(task.id, source, sourceUrl).catch(error => {
      logger.error("Background job collection failed to start or errored", { error, taskId: task.id });
      // Optionally update task status to failed here
      storage.updateTaskStatus(task.id, "failed", `Error: ${error instanceof Error ? error.message : String(error)}`).catch(updateError => {
          logger.error("Failed to update task status after collection error", { updateError, taskId: task.id });
      });
    });

    // Respond immediately to the client
    res.status(202).json({ message: "Job collection task accepted", taskId: task.id });

  } catch (error) {
    logger.error("Failed to start job collection task", { error, body: req.body });
    res.status(500).json({ message: "Failed to start job collection task" });
  }
}

