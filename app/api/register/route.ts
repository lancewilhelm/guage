import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  logger.info("POST /api/register");
  const { email, password, name } = await req.json();

  // Check if user exists
  logger.debug({ email }, "Checking if user exists");
  const existingUser = await db
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

  // Hash password and create user
  logger.debug({ email }, "Creating user");
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.insert(usersTable).values({
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hashedPassword,
  });

  logger.info({ email }, "User registered successfully");
  return NextResponse.json(
    { message: "User registered successfully" },
    { status: 201 },
  );
}
