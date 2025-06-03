import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder
import { autoReplyService } from "../../../server/services/autoReply"; // Adjust path

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Create task entry first
    const task = await storage.createTask({
      name: "Send Pending Replies",
      type: "auto_reply",
      status: "pending",
      config: {}
    });

    // Log activity
    try {
        await storage.createActivity({
            type: "task_created",
            description: `Auto-reply task created: ${task.name}`,
            source: "system",
            result: `Task ID: ${task.id}`,
            status: "success",
            metadata: { taskId: task.id, taskType: task.type }
        });
    } catch (activityError) {
        logger.error("Failed to log auto-reply task creation activity", { activityError, taskId: task.id });
    }

    // Trigger the auto-reply process asynchronously (fire and forget in serverless)
    autoReplyService.sendPendingReplies(task.id).catch(error => {
      logger.error("Background auto-reply failed to start or errored", { error, taskId: task.id });
      // Optionally update task status to failed here
      storage.updateTaskStatus(task.id, "failed", `Error: ${error instanceof Error ? error.message : String(error)}`).catch(updateError => {
          logger.error("Failed to update task status after auto-reply error", { updateError, taskId: task.id });
      });
    });

    // Respond immediately to the client
    res.status(202).json({ message: "Auto reply task accepted", taskId: task.id });

  } catch (error) {
    logger.error("Failed to start auto reply task", { error });
    res.status(500).json({ message: "Failed to start auto reply task" });
  }
}

