import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { chats, messages } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  const chatId = getRouterParam(event, "id");
  logger.debug(`DELETE /api/chats/${chatId}`);

  if (!chatId) {
    logger.error("DELETE /api/chats/[id]: Missing chat ID");
    setResponseStatus(event, 400);
    return {
      message: "Chat ID is required",
    };
  }

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("DELETE /api/chats/[id]: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    // Verify the chat exists and belongs to the user
    const existingChat = await cloudDb
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

    if (!existingChat.length) {
      logger.warn(`DELETE /api/chats/${chatId}: Chat not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Chat not found",
      };
    }

    // Mark the chat as deleted
    await cloudDb
      .update(chats)
      .set({
        deleted: true,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId));

    // Mark all messages in the chat as deleted
    await cloudDb
      .update(messages)
      .set({
        deleted: true,
        updatedAt: new Date(),
      })
      .where(eq(messages.chatId, chatId));

    logger.debug(`DELETE /api/chats/${chatId}: Marked chat and messages as deleted for user ${userId}`);

    return {
      success: true,
      message: "Chat deleted successfully",
    };
  } catch (error) {
    logger.error(error, `DELETE /api/chats/${chatId}: Error deleting chat`);
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to delete chat",
    };
  }
});
