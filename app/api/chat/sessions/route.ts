import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { chatSessionsTable } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { eq, desc, and } from "drizzle-orm";

// GET handler for fetching all chat sessions for the current user
export async function GET() {
  logger.info("GET /api/chat/sessions");
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      logger.warn("GET /api/chat/sessions: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Fetch chat sessions for the current user, ordered by most recent
    logger.debug({ userId }, "GET /api/chat/sessions: Fetching chat sessions");
    const userChatSessions = await db
      .select({
        id: chatSessionsTable.id,
        title: chatSessionsTable.title,
        createdAt: chatSessionsTable.createdAt,
        updatedAt: chatSessionsTable.updatedAt,
        conversationType: chatSessionsTable.conversationType,
      })
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, userId))
      .orderBy(desc(chatSessionsTable.updatedAt));

    logger.debug(
      {
        count: userChatSessions.length,
        ids: userChatSessions.map((s) => s.id),
      },
      "GET /api/chat/sessions: Found chat sessions",
    );
    return NextResponse.json(userChatSessions);
  } catch (error) {
    logger.error(error, "Error fetching chat sessions:");
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 },
    );
  }
}

// POST handler for creating a new chat session
export async function POST(req: NextRequest) {
  logger.info("POST /api/chat/sessions");
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      logger.warn("POST /api/chat/sessions: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { title = "New Chat", conversationType = "chat" } = await req.json();

    // Create a new chat session in the database
    logger.debug(
      { userId, title, conversationType },
      "POST /api/chat/sessions: Creating chat session",
    );
    const [newSession] = await db
      .insert(chatSessionsTable)
      .values({
        title,
        userId,
        conversationType,
      })
      .returning();

    logger.debug(
      { id: newSession.id },
      "POST /api/chat/sessions: Chat session created",
    );
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    logger.error(error, "Error creating chat session:");
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 },
    );
  }
}

// PUT handler for updating a chat session by ID
export async function PUT(req: NextRequest) {
  logger.info("PUT /api/chat/sessions");
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      logger.warn("PUT /api/chat/sessions: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { sessionId, ...updateData } = await req.json();

    // Update the chat session in the database
    logger.debug(
      { userId, sessionId, updateData },
      "PUT /api/chat/sessions: Updating chat session",
    );
    const result = await db
      .update(chatSessionsTable)
      .set(updateData)
      .where(
        and(
          eq(chatSessionsTable.id, sessionId),
          eq(chatSessionsTable.userId, userId),
        ),
      );

    if (result.rowCount === 0) {
      logger.warn("PUT /api/chat/sessions: Chat session not found");
      return new Response("Not Found", { status: 404 });
    }

    logger.debug(
      { id: sessionId },
      "PUT /api/chat/sessions: Chat session updated",
    );
    return NextResponse.json(
      { message: "Chat session updated" },
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, "Error updating chat session:");
    return NextResponse.json(
      { error: "Failed to update chat session" },
      { status: 500 },
    );
  }
}

// DELETE handler for deleting a chat session by ID
export async function DELETE(req: NextRequest) {
  logger.info("DELETE /api/chat/sessions");
  try {
    // Check for authorized user
    const session = await getSession();
    if (!session) {
      logger.warn("DELETE /api/chat/sessions: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { sessionId } = await req.json();

    // Delete the chat session from the database
    logger.debug(
      { userId, sessionId },
      "DELETE /api/chat/sessions: Deleting chat session",
    );
    const result = await db
      .delete(chatSessionsTable)
      .where(
        and(
          eq(chatSessionsTable.id, sessionId),
          eq(chatSessionsTable.userId, userId),
        ),
      );

    if (result.rowCount === 0) {
      logger.warn("DELETE /api/chat/sessions: Chat session not found");
      return new Response("Not Found", { status: 404 });
    }

    logger.debug(
      { id: sessionId },
      "DELETE /api/chat/sessions: Chat session deleted",
    );
    return new Response("Chat session deleted", { status: 200 });
  } catch (error) {
    logger.error(error, "Error deleting chat session:");
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 },
    );
  }
}
