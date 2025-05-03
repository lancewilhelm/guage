import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import { deleteKnowledgeDB } from "~/utils/db/rag";

export default defineEventHandler(async (event) => {
  logger.debug("DELETE /api/knowledge");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("DELETE /api/knowledge: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const { id }: { id: string } = await readBody(event);

  try {
    deleteKnowledgeDB(id);
    return { success: true };
  } catch (error) {
    logger.error("DELETE /api/knowledge: Error deleting knowledge", error);
    setResponseStatus(event, 500);
    return {
      message: "Error fetching knowledge",
    };
  }
});
