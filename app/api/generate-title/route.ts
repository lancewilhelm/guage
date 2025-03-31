import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { LocalMessage } from "@/utils/db/local";
import { getOpenAIClient } from "@/utils/llm/server/streamOpenAi";
import { OpenAI } from "openai";

export async function POST(req: Request) {
  logger.info(req, "POST /api/chat/generate-title");
  const openai = getOpenAIClient()
  // Check for authorized user
  const session = await getSession();
  if (!session) {
    logger.warn("POST /api/chat/generate-title: Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse the request body
  const { userMessage }: { userMessage: LocalMessage } = await req.json();
  if (!userMessage) {
    return new Response("Invalid request: meessage required", {
      status: 400,
    });
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
    return NextResponse.json(title);
  } catch (error) {
    logger.error(error, "Error generating title:");
    return new Response("Internal server error", { status: 500 });
  }
}
