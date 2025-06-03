import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder
import { insertSettingSchema } from "@shared/schema"; // Assuming schema is accessible

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request
  if (req.method === "GET") {
    try {
      const category = req.query.category as string;
      const settings = await storage.getSettings(category);
      return res.status(200).json(settings);
    } catch (error) {
      logger.error("Failed to get settings", { error, query: req.query });
      return res.status(500).json({ message: "Failed to retrieve settings" });
    }
  }

  // Handle POST request (for creating/updating a setting)
  if (req.method === "POST") {
    try {
      const settingData = insertSettingSchema.parse(req.body);
      const setting = await storage.createOrUpdateSetting(settingData);
      return res.status(200).json(setting); // Use 200 OK for create or update
    } catch (error) {
      // Handle potential Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
          logger.warn("Invalid setting data received", { error: error.message, body: req.body });
          return res.status(400).json({ message: "Invalid setting data", errors: (error as any).errors });
      }
      logger.error("Failed to update setting", { error, body: req.body });
      return res.status(500).json({ message: "Failed to update setting" });
    }
  }

  // Handle other methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

