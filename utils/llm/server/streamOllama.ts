import { logger } from "~/utils/logger";
import type { LocalMessage } from "~/utils/db/local";
import { cloudDb } from "~/utils/db/cloud";
import { globalSettings } from "~/utils/db/schema";
import { eq } from "drizzle-orm";

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export async function streamOllama({
  history,
  userMessage,
  model,
}: {
  history: LocalMessage[];
  userMessage: LocalMessage;
  model: string;
}): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages = history.concat([userMessage]).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Fetch the base URL from the global settings
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

        const response = await fetch(`${parsedSettings.ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          logger.error(response, "Failed to connect to Ollama");
          throw new Error("Failed to stream from Ollama");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const decodedText = decoder.decode(value);
          logger.debug(decodedText, "Ollama value:");

          // Split the text by newlines and parse each line as a separate JSON object
          const jsonObjects = decodedText
            .trim()
            .split(/\n+/)
            .filter((text) => text.trim());

          for (const jsonText of jsonObjects) {
            try {
              const chunk = JSON.parse(jsonText) as OllamaResponse;
              logger.debug(chunk, "Ollama chunk:");

              if (chunk.done) return;

              const content = chunk?.message?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `event: messageChunk\ndata: ${JSON.stringify(content)}\n\n`,
                  ),
                );
              }
            } catch (err) {
              console.warn("Failed to parse Ollama chunk", err, jsonText);
            }
          }
        }
      } catch (error) {
        logger.error(error, "Error streaming from Ollama:");
        controller.enqueue(
          encoder.encode("event: error\ndata: Error streaming Ollama\n\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
