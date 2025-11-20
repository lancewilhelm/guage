import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { chats } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  const chatId = getRouterParam(event, "id");
  logger.debug(`PATCH /api/chats/${chatId}`);

  if (!chatId) {
    logger.error("PATCH /api/chats/[id]: Missing chat ID");
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
    logger.error("PATCH /api/chats/[id]: Unauthorized access attempt");
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
          isNull(chats.deleted),
        ),
      )
      .limit(1);

    if (!existingChat.length) {
      logger.warn(`PATCH /api/chats/${chatId}: Chat not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Chat not found",
      };
    }

    const body = await readBody(event);

    // Build update object with only allowed fields
    const updateData: Record<string, string | boolean | string[] | Date> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.pinned !== undefined) {
      updateData.pinned = body.pinned;
    }

    if (body.activeBranch !== undefined) {
      updateData.activeBranch = body.activeBranch;
    }

    // Update the chat
    await cloudDb.update(chats).set(updateData).where(eq(chats.id, chatId));

    logger.debug(`PATCH /api/chats/${chatId}: Updated chat for user ${userId}`);

    return {
      success: true,
      data: { ...existingChat[0], ...updateData },
    };
  } catch (error) {
    logger.error(error, `PATCH /api/chats/${chatId}: Error updating chat`);
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to update chat",
    };
  }
});
