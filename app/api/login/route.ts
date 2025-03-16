import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/utils/auth";

export async function POST(req: Request) {
  logger.info("POST /api/login");
  const { email, password } = await req.json();

  // Find user
  logger.debug({ email }, "POST /api/login: Finding user");
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .execute();
  if (!user || !user[0]) {
    logger.warn("POST /api/login: User not found");
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // Check password
  const passwordValid = await bcrypt.compare(password, user[0].passwordHash);
  if (!passwordValid) {
    logger.warn("POST /api/login: Invalid password");
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // Create session
  logger.debug({ email: user[0].email }, "POST /api/login: Creating session");
  await createSession({
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    role: user[0].role,
  });

  logger.info("POST /api/login: Login successful");
  return NextResponse.json({ message: "Login successful" }, { status: 200 });
}
