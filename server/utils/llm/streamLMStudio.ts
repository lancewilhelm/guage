import { logger } from "~/utils/logger";
import { Chat, LMStudioClient } from "@lmstudio/sdk";
import type { LocalMessage, Usage } from "~/utils/db/local";

export function getLMStudioClient() {
  return new LMStudioClient();
}

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
