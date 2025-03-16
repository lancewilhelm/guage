import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { destroySession } from "@/utils/auth";

export async function POST() {
  logger.info("POST /api/logout");
  await destroySession();
  logger.info("Logged out");
  return NextResponse.json({ message: "Logged out" }, { status: 200 });
}
