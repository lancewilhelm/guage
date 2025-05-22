import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";
import type { LocalMessage, Model } from "~/utils/db/local";

export interface LLMRequest {
  history: LocalMessage[];
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

  const { history, model, systemPrompt }: LLMRequest = await readBody(event);
  logger.debug({ history, model }, "Request body:");

  if (!model) {
    logger.error("POST /api/llm: Invalid request: No provider specified");
    setResponseStatus(event, 400);
    return {
      message: "Invalid request: No provider specified",
    };
  }

  if (!history || !Array.isArray(history)) {
    logger.error("POST /api/llm: Invalid request: messages are required");
    setResponseStatus(event, 400);
    return {
      message: "Invalid request: messages are required",
    };
  }

  try {
    const stream = await providers[model.provider]?.stream({
      history,
      model: model.name,
      systemPrompt,
      url: model.url,
    });

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
