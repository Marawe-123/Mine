import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../../server/services/logger"; // Adjust path relative to api folder

// Use native fetch available in Node.js 18+ (Vercel environment)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(400).json({
        success: false,
        message: "Facebook API credentials not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.",
      });
    }

    // 1. Get App Access Token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error("Failed to get Facebook access token", { status: tokenResponse.status, errorText });
      return res.status(tokenResponse.status).json({
        success: false,
        message: `Failed to get Facebook access token: ${errorText}`,
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = (tokenData as { access_token: string }).access_token;

    if (!accessToken) {
        logger.error("Access token not found in Facebook response", { tokenData });
        return res.status(500).json({ success: false, message: "Access token not found in Facebook response" });
    }

    // 2. Test a simple API call using the App Access Token
    // Use the app endpoint instead of /me since we're using app access token
    const testResponse = await fetch(
      `https://graph.facebook.com/v19.0/${appId}?access_token=${accessToken}&fields=name,category` // Use latest Graph API version
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
       logger.error("Facebook API test call failed", { status: testResponse.status, errorText });
      return res.status(testResponse.status).json({
        success: false,
        message: `Facebook API test call failed: ${errorText}`,
      });
    }

    const testData = await testResponse.json();

    res.status(200).json({
      success: true,
      message: "Facebook API connection successful",
      appInfo: testData,
    });

  } catch (error) {
    logger.error("Facebook API test failed with exception", { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred during Facebook API test",
    });
  }
}

