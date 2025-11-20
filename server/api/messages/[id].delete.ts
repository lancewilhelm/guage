import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { messages, chats } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  const messageId = getRouterParam(event, "id");
  logger.debug(`DELETE /api/messages/${messageId}`);

  if (!messageId) {
    logger.error("DELETE /api/messages/[id]: Missing message ID");
    setResponseStatus(event, 400);
    return {
      message: "Message ID is required",
    };
  }

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("DELETE /api/messages/[id]: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    // Verify the message exists and belongs to the user
    const existingMessage = await cloudDb
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.userId, userId),
          isNull(messages.deleted)
        )
      )
      .limit(1);

    if (!existingMessage.length) {
      logger.warn(`DELETE /api/messages/${messageId}: Message not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Message not found",
      };
    }

    const now = new Date();

    // Mark the message as deleted
    await cloudDb
      .update(messages)
      .set({
        deleted: true,
        updatedAt: now,
      })
      .where(eq(messages.id, messageId));

    // Update the chat's updatedAt timestamp
    await cloudDb
      .update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, existingMessage[0].chatId));

    logger.debug(`DELETE /api/messages/${messageId}: Marked message as deleted for user ${userId}`);

    return {
      success: true,
      message: "Message deleted successfully",
    };
  } catch (error) {
    logger.error(error, `DELETE /api/messages/${messageId}: Error deleting message`);
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to delete message",
    };
  }
});
