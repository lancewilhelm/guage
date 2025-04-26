import { logger } from "~/utils/logger";
import Anthropic from "@anthropic-ai/sdk";
import type { LocalMessage, Usage } from "~/utils/db/local";
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

        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;
        let completionTokens = 0;
        let promptTokens = 0;

        const completion = anthropic.messages.stream({
          max_tokens: 1024,
          model,
          system: systemPrompt,
          messages: formattedMessages,
        });

        for await (const event of completion) {
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }
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
          } else if (event.type === "message_start") {
            promptTokens = event.message.usage.input_tokens;
            completionTokens += event.message.usage.output_tokens;
          } else if (event.type === "message_delta") {
            completionTokens += event.usage.output_tokens;
          }
        }

        const completionTime = performance.now() - responseStartTime;
        const usage: Usage | Partial<Usage> = {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          completionTime,
          tokensPerSecond: (completionTokens / completionTime) * 1000,
          timeToFirstToken,
          temperature: 1,
        };
        controller.enqueue(
          encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`),
        );
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
