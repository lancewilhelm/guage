import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import { logger } from "./logger";

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
    role: "user" | "admin";
  };
}

const SECRET = process.env.AUTH_SECRET!; // Define in .env.local

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
  const token = jwt.sign({ user }, SECRET, { expiresIn: "1y" });
  (await cookies()).set("guage_token", token, { httpOnly: true, path: "/" });
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
    return jwt.verify(token, SECRET) as Session;
  } catch (error) {
    logger.error("Error verifying session token:", error);
    return null;
  }
}

/**
 * Destroy the current session
 */
export async function destroySession() {
  (await cookies()).set("guage_token", "", { expires: new Date(0) });
}
