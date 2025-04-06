import { logger } from "@/utils/logger";
import { cloudDb } from "@/utils/db/cloud";
import { globalSettings } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import type { GlobalSettings } from "@/stores/globalSettings";
import { getOpenAIClient } from "@/utils/llm/server/streamOpenAi";
import { auth } from "@/utils/auth";

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/models");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/models: Unauthorized access attempt");
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

    // Fetch Ollama models
    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
    const settings = await cloudDb
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.id, GLOBAL_SETTINGS_ID))
      .execute();
    if (!settings || !settings[0]) {
      logger.error(
        "GET /api/models: Global settings not found. Skipping Ollama models.",
      );
      return {
        openaiModels: openaiModels.map((model) => model.id),
        ollamaModels: [],
      };
    }
    const parsedSettings = settings[0].settings as GlobalSettings;
    const ollamaModels = parsedSettings.ollamaUrl
      ? await (await fetch(`${parsedSettings.ollamaUrl}/api/tags`)).json()
      : [];

    return {
      openaiModels: openaiModels.map((model) => model.id),
      ollamaModels: ollamaModels.models.length
        ? ollamaModels.models.map((model: OllamaModel) => model.name)
        : [],
    };
  } catch (error) {
    logger.error(error, "GET /api/models: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
