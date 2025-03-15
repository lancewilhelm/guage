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
