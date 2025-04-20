import { logger } from "~/utils/logger";
import { auth } from "~/utils/auth";
import type { LocalMessage, Model } from "~/utils/db/local";
import { completionOpenAI } from "../utils/llm/completionOpenAi";
import { completionOllama } from "../utils/llm/completionOllama";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/generate-title");
  // Check for authorized user
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/generate-title: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  // Parse the request body
  const { userMessage, model }: { userMessage: LocalMessage; model: Model } =
    await readBody(event);
  if (!userMessage) {
    logger.error(
      "POST /api/generate-title: Invalid request, meessage required",
    );
    setResponseStatus(event, 400);
    return { message: "Invalid request: meessage required" };
  }

  const systemPrompt =
    "Generate a short title for a chat based on the user's first message. Do not put quotes around the title.";

  const history = [] as LocalMessage[];

  try {
    let title;
    if (model.provider === "openai") {
      title = await completionOpenAI({
        history,
        userMessage,
        model: model.name,
        systemPrompt: systemPrompt,
      });
    } else if (model.provider === "ollama") {
      title = await completionOllama({
        history,
        userMessage,
        model: model.name,
        url: model.url,
        systemPrompt: systemPrompt,
      });
    }
    return title;
  } catch (error) {
    logger.error(error, "POST /api/generate-title: Error generating title:");
    setResponseStatus(event, 500);
    return { message: "Internal server error" };
  }
});
