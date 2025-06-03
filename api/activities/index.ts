import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const activities = await storage.getActivities(limit, offset);
    res.status(200).json(activities);
  } catch (error) {
    logger.error("Failed to get activities", { error, query: req.query });
    res.status(500).json({ message: "Failed to retrieve activities" });
  }
}

