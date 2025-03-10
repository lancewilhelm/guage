import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET!; // Define in .env.local

export async function createSession(user: { id: string; email: string }) {
  const token = jwt.sign(user, SECRET, { expiresIn: "1h" });
  (await cookies()).set("guage_token", token, { httpOnly: true, path: "/" });
}

export async function getSession() {
  const token = (await cookies()).get("guage_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    console.log('Error verifying token:', error)
    return null;
  }
}

export async function destroySession() {
  (await cookies()).set("guage_token", "", { expires: new Date(0) });
}
