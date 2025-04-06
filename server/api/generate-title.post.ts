import { logger } from "~/utils/logger";
import { auth } from "~/utils/auth";
import type { LocalMessage } from "~/utils/db/local";
import { getOpenAIClient } from "~/utils/llm/server/streamOpenAi";
import type { OpenAI } from "openai";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/generate-title");
  const openai = getOpenAIClient();
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
  const { userMessage }: { userMessage: LocalMessage } = await readBody(event);
  if (!userMessage) {
    logger.error(
      "POST /api/generate-title: Invalid request, meessage required",
    );
    setResponseStatus(event, 400);
    return { message: "Invalid request: meessage required" };
  }

  const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "system",
    content:
      "Generate a short title for a chat based on the users first message. Please do not put quotes around the title.",
  };

  try {
    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: [systemPrompt, userMessage],
      model: "gpt-4o-mini",
    };
    const completion = await openai.chat.completions.create(params);
    const title = completion.choices[0].message.content;
    return title;
  } catch (error) {
    logger.error(error, "POST /api/generate-title: Error generating title:");
    setResponseStatus(event, 500);
    return { message: "Internal server error" };
  }
});
