import { logger } from "~/utils/logger";
import type { LocalMessage, Usage, Model } from "~/utils/db/local";

interface OllamaMesageParam {
  role: "user" | "assistant" | "system";
  content: string;
}

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

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Fetch models
export async function fetchOllamaModels(url?: string) {
  if (!url) {
    logger.error("GET /api/models/ollama: URL is required");
    throw new Error("URL is required");
  }
  try {
    // Fetch Ollama models
    let ollamaModels = { models: [] };
    try {
      ollamaModels =
        url && url.length > 0
          ? await (await fetch(`${url}/api/tags`)).json()
          : { models: [] };
    } catch (error) {
      logger.error(
        error,
        "GET /api/models/ollama: Error fetching Ollama models from the provided URL",
      );
    }
    const models: Model[] = ollamaModels.models.length
      ? ollamaModels.models.map((model: OllamaModel) => ({
          name: model.name,
          displayName: model.name,
          provider: "ollama",
          url,
        }))
      : [];

    return {
      models,
    };
  } catch (error) {
    logger.error(error, "GET /api/models/ollama: Error fetching models");
    throw new Error("Failed to fetch models");
  }
}

// Non-streaming completion
export async function completionOllama({
  history,
  model,
  url,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  url?: string;
  systemPrompt: string;
}) {
  try {
    const formattedMessages: OllamaMesageParam[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    formattedMessages.unshift({ role: "system", content: systemPrompt });

    const completion = await $fetch<OllamaResponse>(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        stream: false,
      }),
    });

    const content = completion.message.content;
    return content;
  } catch (error) {
    logger.error(error, "Error getting Ollama completion");
    throw new Error("Internal server error");
  }
}

// Streaming completion
export async function streamOllama({
  history,
  model,
  url,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  url?: string;
  systemPrompt: string;
}): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formattedMessages: OllamaMesageParam[] = history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        formattedMessages.unshift({ role: "system", content: systemPrompt });

        const queryStartTime = performance.now();
        let timeToFirstToken = 0;
        let responseStartTime = 0;
        let promptTokens = 0;
        let completionTokens = 0;
        let loadDuration = 0;

        const response = await fetch(`${url}/api/chat`, {
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
          if (!timeToFirstToken) {
            timeToFirstToken = performance.now() - queryStartTime;
            responseStartTime = performance.now();
          }

          // Split the text by newlines and parse each line as a separate JSON object
          const jsonObjects = decodedText
            .trim()
            .split(/\n+/)
            .filter((text) => text.trim());

          for (const jsonText of jsonObjects) {
            try {
              const chunk = JSON.parse(jsonText) as OllamaResponse;

              if (chunk.done) {
                promptTokens = chunk.prompt_eval_count || 0;
                completionTokens = chunk.eval_count || 0;
                loadDuration = chunk.load_duration || 0;
                break;
              }

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

          const completionTime = performance.now() - responseStartTime;
          const usage: Usage | Partial<Usage> = {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            completionTime,
            tokensPerSecond: (completionTokens / completionTime) * 1000,
            timeToFirstToken,
            temperature: 1,
            loadDuration,
          };
          controller.enqueue(
            encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`),
          );
        }
      } catch (error) {
        logger.error(error, "Error streaming from Ollama:");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error streaming Ollama: ${error}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
