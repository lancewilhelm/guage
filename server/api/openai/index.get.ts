import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/openai");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/openai: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const config = useRuntimeConfig();

  if (!config.openaiApiKey) {
    logger.error("GET /api/openai: OpenAI client not initialized");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "No OpenAI API key provided",
    };
  }

  return { success: true };
});
