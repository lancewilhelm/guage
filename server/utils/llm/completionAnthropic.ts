import { logger } from "~/utils/logger";
import Anthropic from "@anthropic-ai/sdk";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";
import type { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";

// Client generator
export function getAnthropicClient() {
  const config = useRuntimeConfig();
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey });
}

// Fetch models
export async function fetchAnthropicModels() {
  const anthropic = getAnthropicClient();

  try {
    const modelsList = await anthropic.models.list();
    const models: Model[] = modelsList.data.map((m) => ({
      name: m.id,
      displayName: m.display_name,
      provider: "anthropic",
    }));

    return models;
  } catch (error) {
    logger.error(error, "GET /api/models/anthropic: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionAnthropic({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const anthropic = getAnthropicClient();

  try {
    const completion = await anthropic.messages.create({
      model,
      max_tokens: 200,
      system: systemPrompt,
      messages: history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });
    if (completion.content[0].type === "text") {
      return completion.content[0].text;
    } else {
      throw new Error("Invalid response from Anthropic");
    }
  } catch (error) {
    logger.error(error, "Error getiting completion from Anthropic");
    throw new Error("Internal server error");
  }
}

// Streaming completion
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
