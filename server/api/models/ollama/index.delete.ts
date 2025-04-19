import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("DELETE /api/models/ollama");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("DELETE /api/models/ollama: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const { url, model }: { url: string; model: string } = await readBody(event);

  try {
    await $fetch(`${url}/api/delete`, {
      method: "DELETE",
      body: {
        model,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error(error, "DELETE /api/models/ollama: Error deleting model");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
