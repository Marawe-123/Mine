import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertReplyTemplateSchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const category = req.query.category as string;
      const templates = await storage.getReplyTemplates(category);
      return res.status(200).json(templates);
    } catch (error) {
      logger.error("Failed to get reply templates", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve reply templates" });
    }
  }

  // Handle POST request
  if (req.method === "POST") {
    try {
      const templateData = insertReplyTemplateSchema.parse(req.body);
      const template = await storage.createReplyTemplate(templateData);
      return res.status(201).json(template);
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid reply template data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid template data", errors: (error as any).errors });
      }
      logger.error("Failed to create reply template", { error, body: req.body });
      return res.status(500).json({ message: "Failed to create reply template" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

