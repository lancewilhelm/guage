import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/utils/db";
import { eq } from "drizzle-orm";
import { createSession } from "@/utils/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Find user
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .execute();
  if (!user || !user[0]) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // Check password
  const passwordValid = await bcrypt.compare(password, user[0].passwordHash);
  if (!passwordValid) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // Create session
  await createSession({ id: user[0].id, email: user[0].email });

  return NextResponse.json({ message: "Login successful" }, { status: 200 });
}
