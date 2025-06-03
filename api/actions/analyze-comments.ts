import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder
import { commentAnalyzer } from "../../../server/services/commentAnalyzer"; // Adjust path

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { jobId: jobIdStr } = req.body;
    const jobId = jobIdStr ? parseInt(jobIdStr as string) : undefined;

    // Validate jobId if provided
    if (jobIdStr && (isNaN(jobId as number) || jobId === undefined)) {
        return res.status(400).json({ message: "Invalid Job ID format" });
    }

    // Create task entry first
    const task = await storage.createTask({
      name: `Comment Analysis ${jobId ? `- Job ${jobId}` : "- All Jobs"}`,
      type: "comment_analysis",
      status: "pending",
      config: { jobId }
    });

    // Log activity
    try {
        await storage.createActivity({
            type: "task_created",
            description: `Comment analysis task created: ${task.name}`,
            source: "system",
            result: `Task ID: ${task.id}`,
            status: "success",
            metadata: { taskId: task.id, taskType: task.type, jobId: jobId }
        });
    } catch (activityError) {
        logger.error("Failed to log comment analysis task creation activity", { activityError, taskId: task.id });
    }

    // Trigger the analysis asynchronously (fire and forget in serverless)
    commentAnalyzer.analyzeComments(task.id, jobId).catch(error => {
      logger.error("Background comment analysis failed to start or errored", { error, taskId: task.id });
      // Optionally update task status to failed here
      storage.updateTaskStatus(task.id, "failed", `Error: ${error instanceof Error ? error.message : String(error)}`).catch(updateError => {
          logger.error("Failed to update task status after analysis error", { updateError, taskId: task.id });
      });
    });

    // Respond immediately to the client
    res.status(202).json({ message: "Comment analysis task accepted", taskId: task.id });

  } catch (error) {
    logger.error("Failed to start comment analysis task", { error, body: req.body });
    res.status(500).json({ message: "Failed to start comment analysis task" });
  }
}

