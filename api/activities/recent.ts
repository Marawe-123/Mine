import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const hours = parseInt(req.query.hours as string) || 24;
    if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({ message: "Invalid hours parameter" });
    }
    const activities = await storage.getRecentActivities(hours);
    res.status(200).json(activities);
  } catch (error) {
    logger.error("Failed to get recent activities", { error, query: req.query });
    res.status(500).json({ message: "Failed to retrieve recent activities" });
  }
}

