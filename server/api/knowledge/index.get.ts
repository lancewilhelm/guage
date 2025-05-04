import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import { cloudDb } from "~~/server/utils/db/cloud";
import { knowledge } from "~/utils/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/knowledge");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/knowledge: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  try {
    const dbs = await cloudDb
      .select()
      .from(knowledge)
      .where(eq(knowledge.userId, session.user.id));

    return { dbs };
  } catch (error) {
    logger.error("GET /api/knowledge: Error fetching knowledge", error);
    setResponseStatus(event, 500);
    return {
      message: "Error fetching knowledge",
    };
  }
});
