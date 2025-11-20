import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { chats } from "~/utils/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/chats");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/chats: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    // Retrieve all chats for the user, excluding deleted ones, sorted by most recent first
    const userChats = await cloudDb
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.userId, userId),
          isNull(chats.deleted)
        )
      )
      .orderBy(desc(chats.updatedAt));

    logger.debug(`GET /api/chats: Retrieved ${userChats.length} chats for user ${userId}`);

    return {
      success: true,
      data: userChats,
    };
  } catch (error) {
    logger.error(error, "GET /api/chats: Error retrieving chats");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to retrieve chats",
    };
  }
});
