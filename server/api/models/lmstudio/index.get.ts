import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/models/lmstudio");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/models/lmstudio: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const lmStudio = getLMStudioClient();

  try {
    const modelsList = await lmStudio.system.listDownloadedModels();
    const models = modelsList.map((m) => ({
      name: m.modelKey,
      displayName: m.displayName,
      provider: "lmstudio",
    }));

    return {
      models,
    };
  } catch (error) {
    logger.error(error, "GET /api/models/lmstudio: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
