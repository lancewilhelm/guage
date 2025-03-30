import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { messagesTable, chatsTable } from "@/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { count } from "drizzle-orm";
import { getSession } from "@/utils/auth";

export async function GET() {
  logger.debug("GET /api/stats");

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    logger.warn("GET /api/sync: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // const userId = session.user.id;

  try {
    const chatCount = await cloudDb.select({ count: count() }).from(chatsTable);

    const messageCount = await cloudDb
      .select({ count: count() })
      .from(messagesTable);

    return NextResponse.json({
      chatCount: chatCount[0].count,
      messageCount: messageCount[0].count,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in nuke:", error);
    return NextResponse.json({ error: "Failed to nuke" }, { status: 500 });
  }
}
