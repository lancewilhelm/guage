import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { messagesTable } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { eq, and } from "drizzle-orm";

// GET handler for fetching all chat sessions for the current user
export async function GET(req: Request) {
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // Fetch chat sessions for the current user, ordered by most recent
    const messages = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.userId, userId),
          eq(messagesTable.sessionId, sessionId),
        ),
      )
      .orderBy(messagesTable.createdAt);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 },
    );
  }
}

// // Update a message by ID
// export async function PUT(req: Request) {
//   try {
//     // Check for authorized user
//     const session = await getSession();
//     if (!session) {
//       return new Response("Unauthorized", { status: 401 });
//     }
//
//     const userId = session.user.id;
//     const { messageId, ...updateData } = await req.json();
//
//     // Update the chat session in the database
//     const result = await db
//       .update(messagesTable)
//       .set(updateData)
//       .where(
//         and(eq(messagesTable.id, messageId), eq(messagesTable.userId, userId)),
//       );
//
//     if (result.rowCount === 0) {
//       return new Response("Message Not Found", { status: 404 });
//     }
//
//     return NextResponse.json({ message: "Message updated" }, { status: 200 });
//   } catch (error) {
//     console.error("Error updating message:", error);
//     return NextResponse.json(
//       { error: "Failed to update message" },
//       { status: 500 },
//     );
//   }
// }
