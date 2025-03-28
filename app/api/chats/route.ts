import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { chatsTable, InsertChat } from "@/utils/db/schema.sqlite";
import { getSession } from "@/utils/auth";
import { cloudDb } from "@/utils/db/cloud.sqlite";
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
      chat.createdAt = chat.createdAt;
      chat.updatedAt = chat.updatedAt;
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

    logger.debug("POST /api/chats: Synced chats", result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error("Error bulk syncing chats:", error);
    return NextResponse.json({ success: false, error: "Unknown error" });
  }
}
