import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { getSession } from "@/utils/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  // Check for authorized user
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse the request body
  const {
    messages,
  }: { messages: Array<OpenAI.Chat.ChatCompletionMessageParam> } =
    await req.json();
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

  try {
    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: [systemPrompt, ...messages],
      model: "gpt-4o-mini",
    };
    const completion = await openai.chat.completions.create(params);
    const title = completion.choices[0].message.content;
    return NextResponse.json(title);
  } catch (error) {
    console.log("Error in the chat API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
