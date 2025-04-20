import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";
import { streamOpenAI } from "~~/server/utils/llm/streamOpenAi";
import { streamOllama } from "~~/server/utils/llm/streamOllama";
import type { LocalMessage, Model } from "~/utils/db/local";

export interface LLMRequest {
  history: LocalMessage[];
  userMessage: LocalMessage;
  model: Model;
  systemPrompt: string;
}

export default defineEventHandler(async (event) => {
  logger.info("POST /api/llm");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/llm: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const { history, userMessage, model, systemPrompt }: LLMRequest =
    await readBody(event);
  logger.debug({ history, userMessage, model }, "Request body:");

  if (!model) {
    logger.error("POST /api/llm: Invalid request: No provider specified");
    setResponseStatus(event, 400);
    return {
      message: "Invalid request: No provider specified",
    };
  }

  if (!history || !Array.isArray(history) || !userMessage) {
    logger.error("POST /api/llm: Invalid request: messages are required");
    setResponseStatus(event, 400);
    return {
      message: "Invalid request: messages are required",
    };
  }

  try {
    let stream: ReadableStream;

    switch (model.provider) {
      case "openai":
        stream = await streamOpenAI({
          history,
          userMessage,
          model: model.name,
          systemPrompt,
        });
        break;
      case "ollama":
        if (!model.url) {
          logger.error("POST /api/llm: Invalid request: No URL specified");
          setResponseStatus(event, 400);
          return {
            message: "Invalid request: No URL specified",
          };
        }
        stream = await streamOllama({
          history,
          userMessage,
          model: model.name,
          url: model.url,
          systemPrompt,
        });
        break;
      default:
        throw createError({
          statusCode: 400,
          message: "Unknown provider",
        });
    }

    setHeaders(event, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
    });

    return sendStream(event, stream);
  } catch (error) {
    logger.error(error, "POST /api/llm: Error processing request");
    setResponseStatus(event, 500);
    return {
      message: "Internal server error",
    };
  }
});
