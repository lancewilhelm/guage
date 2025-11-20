import { cloudDb } from "~~/server/utils/db/cloud";
import { logger } from "~/utils/logger";
import { chats } from "~/utils/db/schema";
import type { InsertChats } from "~/utils/db/schema";
import { auth } from "~/utils/auth";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  logger.debug("POST /api/chats");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/chats: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const userId = session.user.id;

  try {
    const body = await readBody(event);
    const title = body.title || "New Chat";

    const now = new Date();
    const newChat: InsertChats = {
      id: uuidv4(),
      title,
      userId,
      activeBranch: [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
    };

    await cloudDb.insert(chats).values(newChat);

    // Query the chat back to ensure it's committed and visible
    const chatId = newChat.id as string;
    const insertedChat = await cloudDb
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (!insertedChat.length) {
      throw new Error("Failed to verify chat creation");
    }

    logger.debug(
      `POST /api/chats: Created chat ${newChat.id} for user ${userId}`,
    );

    return {
      success: true,
      data: insertedChat[0],
    };
  } catch (error) {
    logger.error(error, "POST /api/chats: Error creating chat");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Failed to create chat",
    };
  }
});
