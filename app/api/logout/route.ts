import { NextResponse } from "next/server";
import { destroySession } from "@/utils/auth";

export async function POST() {
  await destroySession();
  return NextResponse.json({ message: "Logged out" }, { status: 200 });
}
