import { logger } from "~/utils/logger";
import {
  type GenerateContentResponseUsageMetadata,
  GoogleGenAI,
} from "@google/genai";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";

// Client generator
export function getGeminiClient() {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
}

// Fetch models
export async function fetchGeminiModels() {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  try {
    // Fetch Gemini models
    const response = await $fetch<{ models: Model[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const models: Model[] = response.models
      .filter((m) => m.name?.startsWith("models/gemini"))
      .map((m) => ({
        name: m.name?.slice("models/".length),
        displayName: m.displayName,
        provider: "gemini",
      }));

    return models;
  } catch (error) {
    logger.error(error, "GET /api/models/openai: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionGemini({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const gemini = getGeminiClient();

  try {
    const completion = await gemini.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: history.map((m) => m.content),
    });
    return completion.text || null;
  } catch (error) {
    logger.error(error, "Error getiting completion from Gemini");
    throw new Error("Internal server error");
  }
}

// Streaming completion
export async function streamGemini({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const gemini = getGeminiClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedHistory = history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        const chat = gemini.chats.create({
          model,
          history: formattedHistory.slice(0, -1),
          config: {
            systemInstruction: systemPrompt,
          },
        });

        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;

        const completion = await chat.sendMessageStream({
          message: history[history.length - 1].content,
        });

        let usageChunk: GenerateContentResponseUsageMetadata | undefined;
        for await (const chunk of completion) {
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }
          usageChunk = chunk.usageMetadata;
          const text = chunk.text || "";
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
            ),
          );
        }

        if (usageChunk) {
          const completionTime = performance.now() - responseStartTime;
          const usage: Usage | Partial<Usage> = {
            promptTokens: usageChunk.promptTokenCount,
            completionTokens: usageChunk.candidatesTokenCount,
            totalTokens:
              (usageChunk.promptTokenCount ?? 0) +
              (usageChunk.candidatesTokenCount ?? 0),
            completionTime,
            tokensPerSecond:
              ((usageChunk.candidatesTokenCount ?? 0) / completionTime) * 1000,
            timeToFirstToken,
            temperature: 69,
          };
          controller.enqueue(
            encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`),
          );
        }
      } catch (error) {
        logger.error(error, "Error streaming Gemini");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error streaming Gemini: ${error}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
