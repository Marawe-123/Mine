import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const replies = await storage.getPendingReplies();
    res.status(200).json(replies);
  } catch (error) {
    logger.error("Failed to get pending replies", { error });
    res.status(500).json({ message: "Failed to retrieve pending replies" });
  }
}

