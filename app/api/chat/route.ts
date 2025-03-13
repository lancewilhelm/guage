import { OpenAI } from "openai";
import { getSession } from "@/utils/auth";
import { db } from "@/utils/db";
import { messagesTable, type insertMessage } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to save assistant's response after streaming completes
export async function saveAssistantMessage(
  sessionId: string,
  userId: string,
  content: string,
  parentMessageId: string | null,
) {
  try {
    let threadPath = "0";
    let depth = 0;

    if (parentMessageId) {
      const parentMessage = await db.query.messagesTable.findFirst({
        where: eq(messagesTable.id, parentMessageId),
      });

      if (parentMessage) {
        threadPath = `${parentMessage.threadPath}/${parentMessage.id}`;
        depth = parentMessage.depth + 1;
      }
    }

    await db.insert(messagesTable).values({
      sessionId,
      userId,
      parentId: parentMessageId,
      content,
      role: "assistant",
      depth,
      threadPath,
    });
  } catch (error) {
    console.error("Error saving assistant message:", error);
  }
}

export async function POST(req: Request) {
  // Check for authorized user
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Parse the request body
  const {
    messages,
    sessionId,
  }: { messages: insertMessage[]; sessionId: string } = await req.json();
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid request: messages are required", {
      status: 400,
    });
  }

  try {
    // Save the user message to db
    const userMessage = messages[messages.length - 1];

    // Determine parent message and path for threading
    let parentId = null;
    let threadPath = "0";
    let depth = 0;

    // If there are previous messages, find the last one to use as parent
    if (messages.length > 1) {
      const lastMessage = await db.query.messagesTable.findFirst({
        where: eq(messagesTable.sessionId, sessionId),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      });

      if (lastMessage) {
        parentId = lastMessage.id;
        threadPath = `${lastMessage.threadPath}/${lastMessage.id}`;
        depth = lastMessage.depth + 1;
      }
    }

    // Store the user message
    await db.insert(messagesTable).values({
      sessionId,
      userId,
      parentId,
      content: userMessage.content,
      role: "user",
      depth,
      threadPath,
    });

    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      model: "gpt-4o-mini",
      stream: true,
    };
    const completion = await openai.chat.completions.create(params);

    const encoder = new TextEncoder();
    let fullAsssistantResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
            const text = chunk.choices[0]?.delta?.content || "";
            fullAsssistantResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode("Error: Failed to stream response."),
          );
          console.error("Error streaming response:", error);
        } finally {
          await saveAssistantMessage(
            sessionId,
            userId,
            fullAsssistantResponse,
            parentId,
          );
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
    console.log("Error in the chat API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
