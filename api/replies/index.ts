import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertReplySchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const commentId = req.query.commentId ? parseInt(req.query.commentId as string) : undefined;
      
      // Ensure commentId is a number if provided
      if (req.query.commentId && isNaN(commentId as number)) {
          return res.status(400).json({ message: "Invalid Comment ID format" });
      }

      const replies = await storage.getReplies(commentId);
      return res.status(200).json(replies);
    } catch (error) {
      logger.error("Failed to get replies", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve replies" });
    }
  }

  // Handle POST request
  if (req.method === "POST") {
    try {
      const replyData = insertReplySchema.parse(req.body);
      const reply = await storage.createReply(replyData);
      return res.status(201).json(reply);
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid reply data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid reply data", errors: (error as any).errors });
      }
      logger.error("Failed to create reply", { error, body: req.body });
      return res.status(500).json({ message: "Failed to create reply" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

