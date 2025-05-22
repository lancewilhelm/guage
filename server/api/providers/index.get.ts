import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import { globalSettings } from "~/utils/db/schema";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import type { GlobalSettings } from "~/stores/globalSettings";

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
  // Anthropic
  if (config.anthropicApiKey) {
    providers.push("anthropic");
  }
  // LM Studio
  const lmStudio = getLMStudioClient();
  const lmStudioVersion = await lmStudio.system.getLMStudioVersion();
  if (lmStudioVersion) {
    providers.push("lmstudio");
  }
  // Ollama
  const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
  const globalSettingsRes = (await cloudDb
    .select()
    .from(globalSettings)
    .where(and(eq(globalSettings.id, GLOBAL_SETTINGS_ID)))) as InferSelectModel<
    typeof globalSettings
  >[];
  if (globalSettingsRes[0].settings) {
    const settings = globalSettingsRes[0].settings as GlobalSettings;
    const urls = settings.ollamaUrls;
    for (const url of urls) {
      if (url) {
        providers.push("ollama");
        break;
      }
    }
  }

  return { providers };
});
