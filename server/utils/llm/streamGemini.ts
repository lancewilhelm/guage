import { logger } from "~/utils/logger";
import { GoogleGenAI } from "@google/genai";
import type { LocalMessage } from "~/utils/db/local";

export function getGeminiClient() {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
}

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

        const completion = await chat.sendMessageStream({
          message: history[history.length - 1].content,
        });

        for await (const chunk of completion) {
          const text = chunk.text || "";
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
            ),
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
