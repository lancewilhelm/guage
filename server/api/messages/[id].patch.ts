import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { messages, chats } from "~/utils/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  const messageId = getRouterParam(event, "id");
  logger.debug(`PATCH /api/messages/${messageId}`);

  if (!messageId) {
    logger.error("PATCH /api/messages/[id]: Missing message ID");
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
    logger.error("PATCH /api/messages/[id]: Unauthorized access attempt");
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
      logger.warn(`PATCH /api/messages/${messageId}: Message not found or unauthorized`);
      setResponseStatus(event, 404);
      return {
        message: "Message not found",
      };
    }

    const body = await readBody(event);

    // Build update object with only allowed fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.content !== undefined) {
      updateData.content = body.content;
    }

    if (body.childrenIds !== undefined) {
      updateData.childrenIds = body.childrenIds;
    }

    if (body.error !== undefined) {
      updateData.error = body.error;
    }

    if (body.model !== undefined) {
      updateData.model = body.model;
    }

    if (body.usage !== undefined) {
      updateData.usage = body.usage;
    }

    if (body.files !== undefined) {
      updateData.files = body.files;
    }

    if (body.knowledge !== undefined) {
      updateData.knowledge = body.knowledge;
    }

    if (body.retrievedKnowledge !== undefined) {
      updateData.retrievedKnowledge = body.retrievedKnowledge;
    }

    // Update the message
    await cloudDb
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId));

    // Update the chat's updatedAt timestamp
    await cloudDb
      .update(chats)
      .set({ updatedAt: updateData.updatedAt })
      .where(eq(chats.id, existingMessage[0].chatId));

    logger.debug(`PATCH /api/messages/${messageId}: Updated message for user ${userId}`);

    return {
      success: true,
      data: { ...existingMessage[0], ...updateData },
    };
  } catch (error) {
    logger.error(error, `PATCH /api/messages/${messageId}: Error updating message`);
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to update message",
    };
  }
});
