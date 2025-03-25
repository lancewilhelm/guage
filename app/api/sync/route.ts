import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { messagesTable, chatsTable } from "@/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { sql } from "drizzle-orm";
import { getSession } from "@/utils/auth";

export async function GET(req: Request) {
  logger.debug("GET /api/sync");
  // Extract the 'since' parameter from the URL
  const { searchParams } = new URL(req.url ? req.url : "");
  const since = searchParams.get("since");
  if (!since) {
    logger.warn("GET /api/sync: Missing 'since' parameter");
    return NextResponse.json(
      { error: "Missing 'since' parameter" },
      { status: 400 },
    );
  }

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session) {
    logger.warn("GET /api/sync: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const sinceDate = new Date(since).toISOString();

    const messages = await cloudDb
      .select()
      .from(messagesTable)
      .where(
        sql`${messagesTable.updatedAt} > ${sinceDate} AND ${messagesTable.userId} = ${userId}`,
      );

    // Similarly, select chat sessions for this user
    const chats = await cloudDb
      .select()
      .from(chatsTable)
      .where(
        sql`${chatsTable.updatedAt} > ${sinceDate} AND ${chatsTable.userId} = ${userId}`,
      );

    logger.debug(
      {
        sinceDate,
        messages,
        chats,
      },
      "GET /api/sync: Returning messages and chats",
    );
    return NextResponse.json({ messages, chats });
  } catch (error) {
    logger.error("Error in pull sync:", error);
  }
}
