import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET!; // Define in .env.local

export async function createSession(user: { id: string; email: string }) {
  console.log('creating session')
  const token = jwt.sign(user, SECRET, { expiresIn: "1h" });
  (await cookies()).set("token", token, { httpOnly: true, path: "/" });
}

export async function getSession() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).set("token", "", { expires: new Date(0) });
}
