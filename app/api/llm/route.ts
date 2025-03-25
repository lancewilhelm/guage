import { logger } from "@/utils/logger";
import { OpenAI } from "openai";
import { getSession } from "@/utils/auth";
import { LocalMessage } from "@/types/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  logger.info("POST /api/llm");
  // Check for authorized user
  const session = await getSession();
  if (!session) {
    logger.warn("POST /api/llm: Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Parse the request body
  const {
    history,
    userMessage,
    chatId,
  }: {
    history: LocalMessage[];
    userMessage: LocalMessage;
    chatId: string;
  } = await req.json();
  if (!history || !Array.isArray(history) || !userMessage) {
    return new Response("Invalid request: messages are required", {
      status: 400,
    });
  }

  logger.debug({ history, userMessage }, "POST /api/llm: Request body");

  try {
    logger.debug(
      { userId, chatId: chatId, userMessage },
      "POST /api/llm: Processing user message",
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start the OpenAI completion
          logger.debug(
            { history, userMessage },
            "POST /api/llm: Starting OpenAI completion",
          );
          const messages = history.concat([userMessage]);
          const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: messages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            })),
            model: "gpt-4o-mini",
            stream: true,
          };
          const completion = await openai.chat.completions.create(params);

          // Now handle the completion chunks from LLM service
          for await (const chunk of completion as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
            const text = chunk.choices[0]?.delta?.content || "";
            logger.debug({ text }, "POST /api/llm: Streaming response");
            controller.enqueue(
              encoder.encode(
                `event: messageChunk\ndata: ${JSON.stringify(text)}\n\n`,
              ),
            );
          }
        } catch (error) {
          logger.error(error, "Error streaming response:");
          controller.enqueue(
            encoder.encode(
              "event: error\n data: Failed to stream response.\n\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    logger.error(error, "Error processing user message:");
    return new Response("Internal server error", { status: 500 });
  }
}
