import { logger } from "~/utils/logger";
import { auth } from "~/utils/auth";
import { providers } from "~~/server/utils/llm/providers";
import type { Model } from "~/utils/db/local";
import type { GlobalSettings } from "~/stores/globalSettings";
import { globalSettings } from "~/utils/db/schema";
import { cloudDb } from "~~/server/utils/db/cloud";
import { and, eq, type InferSelectModel } from "drizzle-orm";

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

  const provider = getQuery(event).provider as string | undefined;
  const urls = getQuery(event).urls as string[] | undefined;
  console.log("urls", urls);
  if (!provider) {
    logger.error("GET /api/models: Missing provider");
    setResponseStatus(event, 400);
    return {
      message: "Missing provider",
    };
  }

  try {
    let models: Model[] = [];
    if (provider !== "ollama") {
      models = await providers[provider]?.fetchModels();
    } else {
      const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
      const globalSettingsRes = (await cloudDb
        .select()
        .from(globalSettings)
        .where(
          and(eq(globalSettings.id, GLOBAL_SETTINGS_ID)),
        )) as InferSelectModel<typeof globalSettings>[];
      if (!urls && globalSettingsRes[0].settings) {
        const settings = globalSettingsRes[0].settings as GlobalSettings;
        const urls = settings.ollamaUrls;
        for (const url of urls) {
          if (url) {
            const modelsRes = await providers[provider]?.fetchModels(url);
            if (modelsRes) {
              models = [...models, ...modelsRes];
            }
          }
        }
      } else if (urls) {
        for (const url of urls) {
          if (url) {
            const modelsRes = await providers[provider]?.fetchModels(url);
            if (modelsRes) {
              models = [...models, ...modelsRes];
            }
          }
        }
      }
    }

    return models;
  } catch (error) {
    logger.error(error, "GET /api/models: Error fetching models");
    setResponseStatus(event, 500);
    return {
      message: "Failed to fetch models",
    };
  }
});
