import { logger } from "@/utils/logger";
import { OpenAI } from "openai";
import { LocalMessage } from "@/utils/db/local";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export async function streamOpenAI({
  history,
  userMessage,
  model,
}: {
  history: LocalMessage[];
  userMessage: LocalMessage;
  model: string;
}): Promise<ReadableStream> {
  const openai = getOpenAIClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages = history.concat([userMessage]);

        const completion = await openai.chat.completions.create({
          model: model,
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
          stream: true,
        });

        for await (const chunk of completion as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
          const text = chunk.choices[0]?.delta?.content || "";
          controller.enqueue(
            encoder.encode(
              `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
            ),
          );
        }
      } catch (error) {
        logger.error(error, "Error streaming OpenAI");
        controller.enqueue(
          encoder.encode("event: error\ndata: Error streaming OpenAI\n\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
