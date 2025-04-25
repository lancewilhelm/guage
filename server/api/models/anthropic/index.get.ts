import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import { getAnthropicClient } from "~~/server/utils/llm/streamAnthropic";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/models/anthropic");

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

  const anthropic = getAnthropicClient();

  try {
    const modelsList = await anthropic.models.list();
    const models = modelsList.data.map((m) => ({
      name: m.id,
      displayName: m.display_name,
      provider: "anthropic",
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
