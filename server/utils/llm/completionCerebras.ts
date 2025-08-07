import { logger } from "~/utils/logger";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";

// Client generator
export function getCerebrasClient() {
  const config = useRuntimeConfig();
  const apiKey = config.cerebrasApiKey;
  if (!apiKey) {
    throw new Error("Missing CEREBRAS_API_KEY");
  }
  return new Cerebras({ apiKey });
}

// Fetch models
export async function fetchCerebrasModels() {
  const cerebras = getCerebrasClient();

  try {
    const modelsList = await cerebras.models.list();
    const models: Model[] = modelsList.data.map((model) => ({
      name: model.id,
      displayName:
        model.id.charAt(0).toUpperCase() +
        model.id.slice(1).replace(/[-.]/g, " "),
      provider: "cerebras",
    }));

    return models;
  } catch (error) {
    logger.error(error, "GET /api/models/cerebras: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionCerebras({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const cerebras = getCerebrasClient();

  try {
    const formattedMessages = history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const params = {
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...formattedMessages,
      ],
      model,
    };

    const completion = await cerebras.chat.completions.create(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (completion as any).choices[0]?.message?.content;
    return content;
  } catch (error) {
    logger.error(error, "Error getting completion from Cerebras");
    throw new Error("Internal server error");
  }
}

// Streaming completion
export async function streamCerebras({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const cerebras = getCerebrasClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages = [
          { role: "system" as const, content: systemPrompt },
          ...history.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;

        const completion = await cerebras.chat.completions.create({
          model: model,
          messages: formattedMessages,
          stream: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let usageChunk: any;
        for await (const chunk of completion) {
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const text = (chunk as any).choices[0]?.delta?.content || "";
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
            ),
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((chunk as any).usage) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            usageChunk = (chunk as any).usage;
          }
        }

        if (usageChunk) {
          const completionTime = performance.now() - responseStartTime;
          const usage: Usage | Partial<Usage> = {
            promptTokens: usageChunk.prompt_tokens,
            completionTokens: usageChunk.completion_tokens,
            totalTokens: usageChunk.total_tokens,
            completionTime,
            tokensPerSecond:
              (usageChunk.completion_tokens / completionTime) * 1000,
            timeToFirstToken,
            temperature: 1,
          };
          controller.enqueue(
            encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`),
          );
        }
      } catch (error) {
        logger.error(error, "Error streaming Cerebras");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error streaming Cerebras: ${error}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
