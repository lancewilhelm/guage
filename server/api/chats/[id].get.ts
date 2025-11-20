import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { chats } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  const chatId = getRouterParam(event, "id");
  logger.debug(`GET /api/chats/${chatId}`);

  if (!chatId) {
    logger.error("GET /api/chats/[id]: Missing chat ID");
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
    logger.error("GET /api/chats/[id]: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    // Retrieve the specific chat, ensuring it belongs to the user and is not deleted
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
      logger.warn(`GET /api/chats/${chatId}: Chat not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Chat not found",
      };
    }

    logger.debug(`GET /api/chats/${chatId}: Retrieved chat for user ${userId}`);

    return {
      success: true,
      data: chat[0],
    };
  } catch (error) {
    logger.error(error, `GET /api/chats/${chatId}: Error retrieving chat`);
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to retrieve chat",
    };
  }
});
