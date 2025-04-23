import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/providers");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/providers: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const config = useRuntimeConfig();

  const providers = [];
  // OpenAI
  if (config.openaiApiKey) {
    providers.push("openai");
  }
  // Gemini
  if (config.geminiApiKey) {
    providers.push("gemini");
  }

  return { providers };
});
