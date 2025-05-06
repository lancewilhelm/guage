import { logger } from "~/utils/logger";
import { OpenAI } from "openai";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";

// Client generator
export function getOpenAIClient() {
  const config = useRuntimeConfig();
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

// Fetch models
export async function fetchOpenAIModels() {
  const openai = getOpenAIClient();

  try {
    // Fetch OpenAI models
    const openaiModelsRaw = (await openai.models.list()).data;
    const nonLanguageKeywords = [
      "babbage",
      "davinci",
      "dall-e",
      "embedding",
      "tts",
      "whisper",
      "audio",
      "computer",
    ];
    const openaiModels = openaiModelsRaw.filter(
      (model) =>
        !nonLanguageKeywords.some((keyword) => model.id.includes(keyword)),
    );

    const models: Model[] = openaiModels.map((model) => ({
      name: model.id,
      displayName: model.id,
      provider: "openai",
    }));

    return { models };
  } catch (error) {
    logger.error(error, "GET /api/models/openai: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionOpenAI({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const openai = getOpenAIClient();

  try {
    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    formattedMessages.unshift({ role: "system", content: systemPrompt });
    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: formattedMessages,
      model,
    };

    const completion = await openai.chat.completions.create(params);
    const content = completion.choices[0].message.content;
    return content;
  } catch (error) {
    logger.error(error, "Error getiting completion from OpenAI");
    throw new Error("Internal server error");
  }
}

// Streaming completion
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
