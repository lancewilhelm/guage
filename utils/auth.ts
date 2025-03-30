import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import { logger } from "./logger";
import { cloudDb } from "./db/cloud";
import { usersTable } from "./db/schema";
import { eq } from "drizzle-orm";

function throwError(message: string): never {
  logger.error(message);
  throw new Error(message);
}

/**
 * The session object
 * @property user - The user object
 * @property user.id - The user ID
 * @property user.email - The user email
 * @property user.name - The user name
 * @property user.role - The user role
 */
export interface Session extends JwtPayload {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "user" | "admin" | "owner";
  };
}

const SECRET = process.env.AUTH_SECRET ?? throwError("AUTH_SECRET not defined"); // Define in .env.local

/**
 * Create a new session and set the session cookie
 * @param user - The user object to create the session with
 * @returns Promise<Session> - The created session
 */
export async function createSession(user: {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
}) {
  const token = jwt.sign({ user }, SECRET, {
    expiresIn: "1y",
    algorithm: "HS256",
  });
  (await cookies()).set("guage_token", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return jwt.decode(token) as Session;
}

/**
 * Get the current session from the request
 * @param req - The request object
 * @returns Promise<Session | null> - The session or null if not found
 */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get("guage_token")?.value;
  if (!token) return null;
  try {
    const session = jwt.verify(token, SECRET, {
      algorithms: ["HS256"],
    }) as Session;

    // Check if the user exists in the database
    const user = await cloudDb
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, session.user.email))
      .execute();
    if (!user || !user[0]) {
      logger.warn("POST /api/login: User not found");
      return null;
    }

    return session;
  } catch (error) {
    logger.error("Error verifying session token:", error);
    return null;
  }
}

/**
 * Destroy the current session
 */
export async function destroySession() {
  (await cookies()).set("guage_token", "", {
    expires: new Date(0),
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
}
