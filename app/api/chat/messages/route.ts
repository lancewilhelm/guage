import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { messagesTable } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { eq, and } from "drizzle-orm";

// GET handler for fetching all chat sessions for the current user
export async function GET(req: Request) {
  logger.info(req, "GET /api/chat/messages");
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      logger.warn("GET /api/chat/messages: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      logger.warn("GET /api/chat/messages: sessionId is required");
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // Fetch chat sessions for the current user, ordered by most recent
    logger.debug(
      { userId, sessionId },
      "GET /api/chat/messages: Fetching messages",
    );
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

    logger.debug(
      { count: messages.length, ids: messages.map((m) => m.id) },
      "GET /api/chat/messages: Found messages",
    );
    return NextResponse.json(messages);
  } catch (error) {
    logger.error(error, "Error fetching chat messages:");
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 },
    );
  }
}
