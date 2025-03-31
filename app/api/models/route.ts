import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { cloudDb } from "@/utils/db/cloud";
import { globalSettings } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { GlobalSettings } from "@/store/globalSettingsStore";
import { getOpenAIClient } from "@/utils/llm/server/streamOpenAi";

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


export async function GET() {
  logger.debug("GET /api/models");

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    logger.warn("GET /api/models: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // const userId = session.user.id;

  const openai = getOpenAIClient();

  try {
    // Fetch OpenAI models
    const openaiModels = (await openai.models.list()).data;
    console.log("openaiModels:", openaiModels);

    // Fetch Ollama models
    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
    const settings = await cloudDb
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.id, GLOBAL_SETTINGS_ID))
      .execute();
    if (!settings || !settings[0]) {
      logger.error("GET /api/models: Global settings not found");
    }
    const parsedSettings = settings[0].settings as GlobalSettings;
    const ollamaModels = await (
      await fetch(`${parsedSettings.ollamaUrl}/api/tags`)
    ).json();

    return NextResponse.json({
      openaiModels: openaiModels.map((model) => model.id),
      ollamaModels: ollamaModels.models.map((model: OllamaModel) => model.name),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error, "Error in fetching models:");
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
