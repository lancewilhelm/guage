import { logger } from "~/utils/logger";
import { Chat, LMStudioClient } from "@lmstudio/sdk";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";

// Client generator
export function getLMStudioClient() {
  return new LMStudioClient();
}

// Fetch models
export async function fetchLMStudioModels() {
  const lmStudio = getLMStudioClient();

  try {
    const modelsList = await lmStudio.system.listDownloadedModels();
    const models: Model[] = modelsList.map((m) => ({
      name: m.modelKey,
      displayName: m.displayName,
      provider: "lmstudio",
    }));

    return {
      models,
    };
  } catch (error) {
    logger.error(error, "GET /api/models/lmstudio: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionLMStudio({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const lmStudio = getLMStudioClient();

  try {
    const messages: {
      role: "user" | "assistant" | "system";
      content: string;
    }[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.unshift({ role: "system", content: systemPrompt });
    const chat = Chat.from(messages);

    const lmStudioModel = await lmStudio.llm.model(model);
    const completion = await lmStudioModel.respond(chat, {
      maxTokens: 200,
    });

    return completion.content;
  } catch (error) {
    logger.error(error, "Error getiting completion from LM Studio");
    throw new Error("Internal server error");
  }
}

// Streaming completion
export async function streamLMStudio({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const lmStudio = getLMStudioClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages: {
          role: "user" | "assistant" | "system";
          content: string;
        }[] = history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        formattedMessages.unshift({ role: "system", content: systemPrompt });
        const chat = Chat.from(formattedMessages);

        const lmStudioModel = await lmStudio.llm.model(model);
        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;
        let completionTokens = 0;
        let promptTokens = 0;

        const completion = lmStudioModel.respond(chat);

        for await (const { content } of completion) {
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(content)}\n\n`,
            ),
          );
        }

        const result = await completion.result();
        promptTokens = result.stats.promptTokensCount || 0;
        completionTokens = result.stats.predictedTokensCount || 0;

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
