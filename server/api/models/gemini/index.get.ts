import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import type { Model } from "@google/genai";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/models/gemini");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/models/gemini: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  try {
    // Fetch Gemini models
    const response = await $fetch<{ models: Model[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const models = response.models
      .filter((m) => m.name?.startsWith("models/gemini"))
      .map((m) => ({
        name: m.name?.slice("models/".length),
        displayName: m.displayName,
        provider: "gemini",
      }));

    return {
      models,
    };
  } catch (error) {
    logger.error(error, "GET /api/models/openai: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
