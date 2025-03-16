import { OpenAI } from "openai";
import { getSession } from "@/utils/auth";
import { db } from "@/utils/db";
import { messagesTable, type InsertMessage } from "@/utils/db/schema";
import { sql, eq } from "drizzle-orm";
import { SelectMessage } from "@/utils/db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to save a message in the db
async function saveMessage(
  sessionId: string,
  userId: string,
  content: string,
  parentId: string | null | undefined,
  role: "assistant" | "user" | "system",
) {
  try {
    let depth = 0;

    if (parentId) {
      const parentMessage = await db.query.messagesTable.findFirst({
        where: eq(messagesTable.id, parentId),
      });

      if (parentMessage) {
        depth = parentMessage.depth + 1;
      }
    }

    const result = (await db
      .insert(messagesTable)
      .values({
        sessionId,
        userId,
        parentId,
        content,
        role,
        depth,
      })
      .returning()) as SelectMessage[];

    // Update the childrenIds of the parent message
    if (parentId) {
      await db.execute(
        sql`UPDATE ${messagesTable} SET children_ids = children_ids || ARRAY[${result[0].id}::uuid] WHERE ${messagesTable.id} = ${parentId}`,
      );
    }

    return result;
  } catch (error) {
    console.error("Error saving message:", error);
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
    history,
    userMessage,
    sessionId,
  }: {
    history: InsertMessage[];
    userMessage: InsertMessage;
    sessionId: string;
  } = await req.json();
  if (!history || !Array.isArray(history) || !userMessage) {
    return new Response("Invalid request: messages are required", {
      status: 400,
    });
  }

  try {
    // Store the user message
    const insertUserMessageResult = await saveMessage(
      sessionId,
      userId,
      userMessage.content,
      userMessage.parentId,
      "user",
    );

    if (!insertUserMessageResult) {
      return new Response("Failed to save user message", { status: 500 });
    }

    const encoder = new TextEncoder();
    let fullAsssistantResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // First send the user message data back to the client
          controller.enqueue(
            encoder.encode(
              `event: userMessage\ndata: ${JSON.stringify(insertUserMessageResult[0])}\n\n`,
            ),
          );

          // Start the OpenAI completion
          const messages = history.concat([userMessage]);
          const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: messages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            })),
            model: "gpt-4o-mini",
            stream: true,
          };
          const completion = await openai.chat.completions.create(params);

          // Now handle the completion chunks from LLM service
          for await (const chunk of completion as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
            const text = chunk.choices[0]?.delta?.content || "";
            fullAsssistantResponse += text;
            controller.enqueue(
              encoder.encode(`event: messageChunk\ndata: ${text}\n\n`),
            );
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              "event: error\n data: Failed to stream response.\n\n",
            ),
          );
          console.error("Error streaming response:", error);
        } finally {
          // Insert whatever we have for the completion into the database and send it to client
          const insertAsssistantMessageResult = await saveMessage(
            sessionId,
            userId,
            fullAsssistantResponse,
            insertUserMessageResult[0].id,
            "assistant",
          );
          if (insertAsssistantMessageResult) {
            controller.enqueue(
              encoder.encode(
                `event: assistantMessage\ndata: ${JSON.stringify(insertAsssistantMessageResult[0])}\n\n`,
              ),
            );
          }
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
