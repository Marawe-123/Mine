import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage'; // Adjust path as needed
import { logger } from '../server/services/logger'; // Adjust path as needed

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const stats = await storage.getStats();
    res.status(200).json(stats);
  } catch (error) {
    logger.error("Failed to get stats", { error });
    res.status(500).json({ message: "Failed to get statistics" });
  }
}

