import OpenAI from "openai";
import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  logger.debug("GET /api/models");

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    logger.warn("GET /api/models: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // const userId = session.user.id;

  try {
    // Fetch OpenAI models
    const openaiModels = (await openai.models.list()).data;
    console.log("openaiModels:", openaiModels);
    const ollamaModels = await (
      await fetch("http://localhost:11434/api/tags")
    ).json();
    console.log("ollamaModels:", ollamaModels);

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
