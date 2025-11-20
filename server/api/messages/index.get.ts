import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { messages, chats } from "~/utils/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/messages");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/messages: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  // Get chatId from query params
  const query = getQuery(event);
  const chatId = query.chatId as string;

  if (!chatId) {
    logger.error("GET /api/messages: Missing chatId parameter");
    setResponseStatus(event, 400);
    return {
      message: "chatId parameter is required",
    };
  }

  try {
    // Verify the chat exists and belongs to the user
    const chat = await cloudDb
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.userId, userId),
          isNull(chats.deleted)
        )
      )
      .limit(1);

    if (!chat.length) {
      logger.warn(`GET /api/messages: Chat ${chatId} not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Chat not found",
      };
    }

    // Retrieve all messages for the chat, excluding deleted ones, sorted by creation time
    const chatMessages = await cloudDb
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          eq(messages.userId, userId),
          isNull(messages.deleted)
        )
      )
      .orderBy(asc(messages.createdAt));

    logger.debug(`GET /api/messages: Retrieved ${chatMessages.length} messages for chat ${chatId}`);

    return {
      success: true,
      data: chatMessages,
    };
  } catch (error) {
    logger.error(error, "GET /api/messages: Error retrieving messages");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to retrieve messages",
    };
  }
});
