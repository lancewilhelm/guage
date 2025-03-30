import { logger } from "@/utils/logger";
import { LocalMessage } from "@/utils/db/local";

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

        const response = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model, // customize per your needs
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

          const chunk = JSON.parse(decoder.decode(value)) as OllamaResponse;
          logger.debug(chunk, "Ollama chunk:");

          if (chunk.done) return;

          try {
            const content = chunk?.message?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(
                  `event: messageChunk\ndata: ${JSON.stringify(content)}\n\n`,
                ),
              );
            }
          } catch (err) {
            console.warn("Failed to parse Ollama chunk", err);
          }
        }
      } catch (error) {
        console.error(error, "Error streaming from Ollama:");
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
