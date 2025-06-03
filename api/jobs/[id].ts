import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage"; // Adjust path relative to api folder
import { logger } from "../../server/services/logger"; // Adjust path relative to api folder

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id: jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ message: "Job ID is required" });
  }

  try {
    const id = parseInt(jobId);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid Job ID format" });
    }
    
    const job = await storage.getJobById(id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json(job);
  } catch (error) {
    logger.error("Failed to get job by ID", { error, jobId });
    res.status(500).json({ message: "Failed to retrieve job" });
  }
}

