import { logger } from "~/utils/logger";
import { OpenAI } from "openai";
import type { LocalMessage, Usage } from "~/utils/db/local";

export function getOpenAIClient() {
  const config = useRuntimeConfig();
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export async function streamOpenAI({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const openai = getOpenAIClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
          history.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
        formattedMessages.unshift({ role: "system", content: systemPrompt });

        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;

        const completion = await openai.chat.completions.create({
          model: model,
          messages: formattedMessages,
          stream: true,
          stream_options: { include_usage: true },
        });

        let usageChunk: OpenAI.Completions.CompletionUsage | undefined;
        for await (const chunk of completion as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }
          const text = chunk.choices[0]?.delta?.content || "";
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
            ),
          );
          if (chunk.usage) {
            usageChunk = chunk.usage;
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
            promptTokensDetails: usageChunk.prompt_tokens_details,
            temperature: 1,
            completionTokensDetails: usageChunk.completion_tokens_details,
          };
          controller.enqueue(
            encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`),
          );
        }
      } catch (error) {
        logger.error(error, "Error streaming OpenAI");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error streaming OpenAI: ${error}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
