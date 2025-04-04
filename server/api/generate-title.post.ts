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
    logger.error("Unauthorized access attempt to /api/generate-title");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  // Parse the request body
  const { userMessage }: { userMessage: LocalMessage } = await readBody(event);
  if (!userMessage) {
    logger.error("Invalid request: meessage required");
    setResponseStatus(event, 400);
    return { message: "Invalid request: meessage required" };
  }

  const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "system",
    content:
      "Generate a short title for a chat based on the users first message. Please do not put quotes around the title.",
  };
  const { role, content } = userMessage;
  const parsedMessage = {
    role,
    content,
  } as OpenAI.Chat.ChatCompletionMessageParam;

  try {
    // Start the OpenAI completion
    logger.debug(
      { userMessage: parsedMessage },
      "POST /api/chat/generate-title: Generating title",
    );
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: [systemPrompt, userMessage],
      model: "gpt-4o-mini",
    };
    const completion = await openai.chat.completions.create(params);
    const title = completion.choices[0].message.content;
    logger.debug({ title }, "POST /api/chat/generate-title: Generated title");
    return title;
  } catch (error) {
    logger.error(error, "Error generating title:");
    setResponseStatus(event, 500);
    return { message: "Internal server error" };
  }
});
