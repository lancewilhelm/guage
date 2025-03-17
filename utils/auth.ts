import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";

export interface Session extends JwtPayload {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "user" | "admin";
  };
}

const SECRET = process.env.AUTH_SECRET!; // Define in .env.local

export async function createSession(user: {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
}) {
  const token = jwt.sign({ user }, SECRET, { expiresIn: "1y" });
  (await cookies()).set("guage_token", token, { httpOnly: true, path: "/" });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get("guage_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as Session;
  } catch (error) {
    console.log("Error verifying token:", error);
    return null;
  }
}

export async function destroySession() {
  (await cookies()).set("guage_token", "", { expires: new Date(0) });
}
