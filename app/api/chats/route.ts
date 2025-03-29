import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { chatsTable, InsertChat } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { cloudDb } from "@/utils/db/cloud";
import { sql } from "drizzle-orm";
import { coerceDate } from "@/utils/date";

export async function POST(req: Request) {
  logger.debug("POST /api/chats");
  try {
    const session = await getSession();
    if (!session) {
      logger.warn("POST /api/chats: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const { unsyncedChats }: { unsyncedChats: InsertChat[] } = await req.json();
    logger.debug(unsyncedChats, "POST /api/chats: Syncing chats");

    unsyncedChats.forEach((chat) => {
      chat.userId = session.user.id;
      chat.createdAt = coerceDate(chat.createdAt);
      chat.updatedAt = coerceDate(chat.updatedAt);
    });

    // Bulk upsert chats
    const result = await cloudDb
      .insert(chatsTable)
      .values(unsyncedChats)
      .onConflictDoUpdate({
        target: chatsTable.id,
        set: {
          title: sql.raw("EXCLUDED.title"),
          updatedAt: sql.raw("EXCLUDED.updated_at"),
          deleted: sql.raw("EXCLUDED.deleted"),
          activeBranch: sql.raw("EXCLUDED.active_branch"),
          pinned: sql.raw("EXCLUDED.pinned"),
        },
      })
      .returning();

    logger.debug(result, "POST /api/chats: Synced chats");
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error(error, "Error bulk syncing chats:");
    return NextResponse.json({ success: false, error: "Unknown error" });
  }
}
