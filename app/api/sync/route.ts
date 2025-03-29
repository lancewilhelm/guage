import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import {
  messagesTable,
  chatsTable,
  userSettings,
  globalSettings,
} from "@/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { gt, and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { SelectGlobalSetting, SelectUserSetting } from "@/utils/db/schema";

export async function GET(req: Request) {
  logger.debug("GET /api/sync");

  // Extract the 'since' parameter from the URL
  const { searchParams } = new URL(req.url ?? "");
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
    const sinceDate = new Date(since);

    // Pull updated messages for the user
    const messages = await cloudDb
      .select()
      .from(messagesTable)
      .where(
        and(
          gt(messagesTable.updatedAt, sinceDate),
          eq(messagesTable.userId, userId),
        ),
      );

    // Pull updated chats for the user
    const chats = await cloudDb
      .select()
      .from(chatsTable)
      .where(
        and(gt(chatsTable.updatedAt, sinceDate), eq(chatsTable.userId, userId)),
      );

    // Pull updated user settings
    const userSettingsRes = (await cloudDb
      .select()
      .from(userSettings)
      .where(
        and(
          eq(userSettings.userId, userId),
          gt(userSettings.updatedAt, sinceDate),
        ),
      )) as SelectUserSetting[];

    // Pull updated global settings
    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
    const globalSettingsRes = (await cloudDb
      .select()
      .from(globalSettings)
      .where(
        and(
          eq(globalSettings.id, GLOBAL_SETTINGS_ID),
          gt(globalSettings.updatedAt, sinceDate),
        ),
      )) as SelectGlobalSetting[];

    const user = userSettingsRes[0]
      ? {
          settings: userSettingsRes[0].settings,
          updatedAt: userSettingsRes[0].updatedAt,
        }
      : {};
    const global = globalSettingsRes[0]
      ? {
          settings: globalSettingsRes[0].settings,
          updatedAt: globalSettingsRes[0].updatedAt,
        }
      : {};

    const settings = {
      user,
      global,
    };

    logger.debug("GET /api/sync: Returning messages, chats, and settings");

    console.log("Updated settings from cloud:", settings);
    return NextResponse.json({ messages, chats, settings });
  } catch (error) {
    logger.error(error, "Error in pull sync:");
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
