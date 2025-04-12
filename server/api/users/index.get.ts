import { logger } from "@/utils/logger";
import { users } from "~/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { auth } from "~/utils/auth";

export default defineEventHandler(async (event) => {
  logger.debug("GET /api/users");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session || session.user.role !== "admin") {
    logger.error("GET /api/users: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  try {
    const usersResponse = await cloudDb
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    logger.debug("GET /api/users: Selected users");
    return { users: usersResponse };
  } catch (error) {
    logger.error(error, "GET /api/users: Error fetching user data");
    setResponseStatus(event, 500);
    return {
      message: "Internal Server Error",
    };
  }
});
