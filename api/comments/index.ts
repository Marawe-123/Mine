import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertCommentSchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Ensure jobId is a number if provided
      if (req.query.jobId && isNaN(jobId as number)) {
          return res.status(400).json({ message: "Invalid Job ID format" });
      }

      const comments = await storage.getComments(jobId, limit);
      return res.status(200).json(comments);
    } catch (error) {
      logger.error("Failed to get comments", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve comments" });
    }
  }

  // Handle POST request
  if (req.method === "POST") {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      return res.status(201).json(comment);
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid comment data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid comment data", errors: (error as any).errors });
      }
      logger.error("Failed to create comment", { error, body: req.body });
      return res.status(500).json({ message: "Failed to create comment" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

