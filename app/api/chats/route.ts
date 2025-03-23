import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { InsertChat, chatsTable } from "@/utils/db/schema";
import { getSession } from "@/utils/auth";
import { db } from "@/utils/db";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  logger.debug("POST /api/chats");
  try {
    const session = await getSession();
    if (!session) {
      logger.warn("POST /api/chats: Unauthorized access attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const { unsyncedChats }: { unsyncedChats: InsertChat[] } = await req.json();
    logger.debug("POST /api/messages: Syncing messages", unsyncedChats);

    unsyncedChats.forEach((chat) => {
      chat.userId = session.user.id;
      chat.createdAt = new Date(chat.createdAt);
      chat.updatedAt = new Date(chat.updatedAt);
    });

    // Bulk upsert chats
    const result = await db
      .insert(chatsTable)
      .values(unsyncedChats)
      .onConflictDoUpdate({
        target: chatsTable.id,
        set: {
          title: sql.raw("EXCLUDED.title"),
          updatedAt: sql.raw("EXCLUDED.updated_at"),
          deleted: sql.raw("EXCLUDED.deleted"),
          activeBranch: sql.raw("EXCLUDED.active_branch"),
        },
      })
      .returning();

    logger.debug("POST /api/chats: Synced chats", result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error("Error bulk syncing chats:", error);
    return NextResponse.json({ success: false, error: "Unknown error" });
  }
}
