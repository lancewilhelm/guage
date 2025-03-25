import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { InsertMessage, messagesTable } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { cloudDb } from "@/utils/db/cloud";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  logger.info("POST /api/messages");
  try {
    const session = await getSession();
    if (!session) {
      logger.warn("POST /api/messages: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const { unsyncedMessages }: { unsyncedMessages: InsertMessage[] } =
      await req.json();
    logger.debug("POST /api/messages: Syncing messages", unsyncedMessages);

    unsyncedMessages.forEach((msg) => {
      msg.userId = session.user.id;
      msg.createdAt = new Date(msg.createdAt);
      msg.updatedAt = new Date(msg.updatedAt);
    });

    // Bulk upsert messages
    const result = await cloudDb
      .insert(messagesTable)
      .values(unsyncedMessages)
      .onConflictDoUpdate({
        target: messagesTable.id,
        set: {
          content: sql.raw("EXCLUDED.content"),
          childrenIds: sql.raw("EXCLUDED.children_ids"),
          updatedAt: sql.raw("EXCLUDED.updated_at"),
          deleted: sql.raw("EXCLUDED.deleted"),
        },
      })
      .returning();

    logger.debug("POST /api/messages: Synced messages", result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error(error, "POST /api/messages Error syncing message:");
    return NextResponse.json({ success: false, error: "Unknown error" });
  }
}
