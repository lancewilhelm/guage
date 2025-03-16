import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { getSession } from "@/utils/auth";
import { SelectMessage } from "@/utils/db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  logger.info(req, "POST /api/chat/generate-title");
  // Check for authorized user
  const session = await getSession();
  if (!session) {
    logger.warn("POST /api/chat/generate-title: Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse the request body
  const { messages }: { messages: SelectMessage[] } = await req.json();
  if (!messages || messages.length === 0) {
    return new Response("Invalid request: meessages are required", {
      status: 400,
    });
  }

  const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "system",
    content:
      "Generate a short title for a chat with the following text. Please do not put quotes around the title.",
  };
  const parsedMessages = messages.map((message) => ({
    role: message.role as "user" | "assistant",
    content: message.content,
  })) as OpenAI.Chat.ChatCompletionMessageParam[];

  try {
    // Start the OpenAI completion
    logger.debug(
      { messages: parsedMessages },
      "POST /api/chat/generate-title: Generating title",
    );
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: [systemPrompt, ...parsedMessages],
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
