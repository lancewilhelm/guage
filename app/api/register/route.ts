import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cloudDb } from "@/utils/db/cloud";
import { usersTable } from "@/utils/db/schema";
import { count, eq } from "drizzle-orm";
import { createSession } from "@/utils/auth";

export async function POST(req: Request) {
  logger.info("POST /api/register");
  const { email, password, name } = await req.json();

  // Check if user exists
  logger.debug({ email }, "Checking if user exists");
  const existingUser = await cloudDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .execute();
  if (existingUser.length > 0) {
    logger.warn({ email }, "User already exists");
    return NextResponse.json(
      { message: "User already exists" },
      { status: 400 },
    );
  }

  // Determine if this is the first user
  const users = await cloudDb.select({ count: count() }).from(usersTable);
  const isFirstUser = users[0].count === 0;

  // Hash password and create user
  logger.debug({ email }, "Creating user");
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await cloudDb
    .insert(usersTable)
    .values({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash: hashedPassword,
      role: isFirstUser ? "admin" : "user",
    })
    .returning();

  logger.info({ email }, "User registered successfully");

  // Create session
  logger.debug({ email: user[0].email }, "POST /api/login: Creating session");
  const session = await createSession({
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    role: user[0].role as "admin" | "user",
  });

  return NextResponse.json(
    { message: "User registered successfully", session },
    { status: 201 },
  );
}
