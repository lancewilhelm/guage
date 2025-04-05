import { logger } from "~/utils/logger";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("POST /api/ollama/version");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("Unauthorized access attempt to /api/generate-title");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }
  const { url } = await readBody(event);

  try {
    const ollamaResponse = await fetch(`${url}/api/version`);
    if (!ollamaResponse.ok) {
      logger.error(
        { status: ollamaResponse.status },
        "POST /api/version: Failed to fetch version",
      );
      return {
        success: false,
        message: "Failed to fetch version",
      };
    }

    const data = await ollamaResponse.json();
    if (!data.version) {
      logger.error(
        { data },
        "POST /api/version: Version not found in response",
      );
      return {
        success: false,
        message: "Version not found in response",
      };
    }

    const version = data.version;
    logger.debug({ version }, "POST /api/version: Version retrieved");
    return {
      success: true,
      version,
    };
  } catch (error) {
    logger.error(error, "Error in retrieving Ollama version:");
    return {
      success: false,
      message: "Internal server error",
    };
  }
});
