import { logger } from "~/utils/logger";
import Anthropic from "@anthropic-ai/sdk";
import type { LocalMessage } from "~/utils/db/local";
import type { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";

export function getAnthropicClient() {
  const config = useRuntimeConfig();
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey });
}

export async function streamAnthropic({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const anthropic = getAnthropicClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages: MessageParam[] = history.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        }));

        const completion = anthropic.messages.stream({
          max_tokens: 1024,
          model,
          system: systemPrompt,
          messages: formattedMessages,
        });

        for await (const event of completion) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text || "";
            controller.enqueue(
              encoder.encode(
                `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
              ),
            );
          }
        }
      } catch (error) {
        logger.error(error, "Error streaming Claude");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error streaming Claude: ${error}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
