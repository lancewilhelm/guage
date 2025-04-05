import { logger } from "@/utils/logger";
import { messages, chats } from "~/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { eq } from "drizzle-orm";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/nuke");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("Unauthorized access attempt to /api/nuke");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }
  const userId = session.user.id;

  try {
    await cloudDb.delete(messages).where(eq(messages.userId, userId));

    // Similarly, select chat sessions for this user
    await cloudDb.delete(chats).where(eq(chats.userId, userId));

    return { success: true };
  } catch (error) {
    logger.error("Error in nuke:", error);
    setResponseStatus(event, 500);
    return {
      message: "Internal Server Error",
    };
  }
});
