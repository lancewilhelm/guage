import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { messages, chats } from "~/utils/db/schema";
import type { InsertMessages } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";
import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (event) => {
  logger.debug("POST /api/messages");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/messages: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    const body = await readBody(event);

    if (!body.chatId) {
      logger.error("POST /api/messages: Missing chatId");
      setResponseStatus(event, 400);
      return {
        message: "chatId is required",
      };
    }

    if (!body.content && body.role === "user") {
      logger.error("POST /api/messages: Missing content for user message");
      setResponseStatus(event, 400);
      return {
        message: "content is required for user messages",
      };
    }

    if (!body.role) {
      logger.error("POST /api/messages: Missing role");
      setResponseStatus(event, 400);
      return {
        message: "role is required",
      };
    }

    // Verify the chat exists and belongs to the user
    const chat = await cloudDb
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.id, body.chatId),
          eq(chats.userId, userId),
          isNull(chats.deleted),
        ),
      )
      .limit(1);

    if (!chat.length) {
      logger.warn(
        `POST /api/messages: Chat ${body.chatId} not found or unauthorized`,
      );
      setResponseStatus(event, 404);
      return {
        message: "Chat not found",
      };
    }

    const now = new Date();
    const newMessage: InsertMessages = {
      id: body.id || uuidv4(),
      chatId: body.chatId,
      userId,
      parentId: body.parentId || null,
      childrenIds: body.childrenIds || null,
      content: body.content,
      role: body.role,
      createdAt: now,
      updatedAt: now,
      error: body.error || null,
      model: body.model || null,
      usage: body.usage || null,
      files: body.files || null,
      knowledge: body.knowledge || null,
      retrievedKnowledge: body.retrievedKnowledge || null,
    };

    await cloudDb.insert(messages).values(newMessage);

    // Update the chat's updatedAt timestamp
    await cloudDb
      .update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, body.chatId));

    logger.debug(
      `POST /api/messages: Created message ${newMessage.id} in chat ${body.chatId}`,
    );

    return {
      success: true,
      data: newMessage,
    };
  } catch (error) {
    logger.error(error, "POST /api/messages: Error creating message");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to create message",
    };
  }
});
