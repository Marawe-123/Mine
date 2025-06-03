import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertTaskSchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const tasks = await storage.getTasks(status, limit);
      return res.status(200).json(tasks);
    } catch (error) {
      logger.error("Failed to get tasks", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve tasks" });
    }
  }

  // Handle POST request
  if (req.method === "POST") {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      // Log activity (optional, but good practice)
      try {
          await storage.createActivity({
            type: "task_created",
            description: `New task created: ${task.name}`,
            source: task.source || "system",
            result: `Task ID: ${task.id}`,
            status: "success",
            metadata: { taskId: task.id, taskType: task.type }
          });
      } catch (activityError) {
          logger.error("Failed to log task creation activity", { activityError, taskId: task.id });
          // Continue even if logging fails
      }

      return res.status(201).json(task);
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid task data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid task data", errors: (error as any).errors });
      }
      logger.error("Failed to create task", { error, body: req.body });
      return res.status(500).json({ message: "Failed to create task" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

