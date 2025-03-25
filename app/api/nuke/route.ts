import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { messagesTable, chatsTable } from "@/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";

export async function GET() {
  logger.debug("GET /api/nuke");

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session) {
    logger.warn("GET /api/sync: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    await cloudDb.delete(messagesTable).where(eq(messagesTable.userId, userId));

    // Similarly, select chat sessions for this user
    await cloudDb.delete(chatsTable).where(eq(chatsTable.userId, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in nuke:", error);
    return NextResponse.json({ error: "Failed to nuke" }, { status: 500 });
  }
}
