import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";
import { streamOpenAI } from "~/utils/llm/server/streamOpenAi";
import { streamOllama } from "~/utils/llm/server/streamOllama";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/llm");

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("Unauthorized access attempt to /api/llm");
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const { history, userMessage, model } = await readBody(event);
  logger.debug({ history, userMessage, model }, "Request body:");

  if (!model) {
    logger.error("Invalid request: No provider specified");
    throw createError({
      statusCode: 400,
      message: "Provider is required",
    });
  }

  if (!history || !Array.isArray(history) || !userMessage) {
    logger.error("Invalid request: messages are required");
    throw createError({
      statusCode: 400,
      message: "Invalid request: messages are required",
    });
  }

  try {
    let stream: ReadableStream;

    switch (model.provider) {
      case "openai":
        stream = await streamOpenAI({
          history,
          userMessage,
          model: model.name,
        });
        break;
      case "ollama":
        stream = await streamOllama({
          history,
          userMessage,
          model: model.name,
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
  } catch (err) {
    logger.error(err, "Error streaming response");
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
});
