import { logger } from "@/utils/logger";
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
  logger.debug("GET /api/models/ollama");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/models/ollama: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  try {
    // Fetch Ollama models
    let ollamaModels = { models: [] };
    const url = getQuery(event).url as string | undefined;
    try {
      ollamaModels =
        url && url.length > 0
          ? await (await fetch(`${url}/api/tags`)).json()
          : { models: [] };
    } catch (error) {
      logger.error(
        error,
        "GET /api/models/ollama: Error fetching Ollama models from the provided URL",
      );
    }
    const models = ollamaModels.models.length
      ? ollamaModels.models.map((model: OllamaModel) => ({
          name: model.name,
          displayName: model.name,
          provider: "ollama",
          url,
        }))
      : [];

    return {
      models,
    };
  } catch (error) {
    logger.error(error, "GET /api/models/ollama: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
