import { logger } from "@/utils/logger";
import { auth } from "@/utils/auth";
import { retrieveKnowledge } from "@@/server/utils/db/rag";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/knowledge/document");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("GET /api/knowledge/document: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const { knowledgeName, query, type } = getQuery<{
    knowledgeName: string;
    type: "all" | "vector";
    query?: string;
  }>(event);

  try {
    const retrievedKnowledge = await retrieveKnowledge(
      knowledgeName,
      type,
      query,
    );
    const remappedKnowledge = retrievedKnowledge?.map((item) => {
      const { vector: _, ...rest } = item;
      return {
        ...rest,
      };
    });
    return { knowledge: remappedKnowledge };
  } catch (error) {
    logger.error(
      "GET /api/knowledge/document: Error fetching documents",
      error,
    );
    setResponseStatus(event, 500);
    return {
      message: "Error fetching documents",
    };
  }
});
