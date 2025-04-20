import { logger } from "@/utils/logger";
import { getOpenAIClient } from "~~/server/utils/llm/streamOpenAi";
import { auth } from "@/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/models/openai");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/models/openai: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const openai = getOpenAIClient();

  try {
    // Fetch OpenAI models
    const openaiModelsRaw = (await openai.models.list()).data;
    const nonLanguageKeywords = [
      "babbage",
      "davinci",
      "dall-e",
      "embedding",
      "tts",
      "whisper",
      "audio",
      "computer",
    ];
    const openaiModels = openaiModelsRaw.filter(
      (model) =>
        !nonLanguageKeywords.some((keyword) => model.id.includes(keyword)),
    );

    return {
      models: openaiModels.map((model) => model.id),
    };
  } catch (error) {
    logger.error(error, "GET /api/models/openai: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
