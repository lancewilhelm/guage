import { cloudDb } from "~/utils/db/cloud";
import { logger } from "~/utils/logger";
import {
  chats,
  messages,
  userSettings,
  globalSettings,
} from "~/utils/db/schema";
import {
  type InferInsertModel,
  type InferSelectModel,
  sql,
  and,
  eq,
  gt,
} from "drizzle-orm";
import { auth } from "~/utils/auth";
import type { SyncRequest } from "~/stores/sync";

export function coerceDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string")
    return new Date(value);
  return new Date();
}

export default defineEventHandler(async (event) => {
  logger.debug("POST /api/sync");
  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/sync: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  const user = session.user;

  const body = await readBody<SyncRequest>(event);
  logger.debug(body, "POST /api/sync: Request body");

  try {
    // If this is a full sync then insert the unsynced data into the cloud database
    if (body.type === "full") {
      // Insert chats
      if (body.chats.length) {
        body.chats.forEach((chat: InferInsertModel<typeof chats>) => {
          chat.userId = session.user.id;
          chat.createdAt = coerceDate(chat.createdAt);
          chat.updatedAt = coerceDate(chat.updatedAt);
        });

        await cloudDb
          .insert(chats)
          .values(body.chats)
          .onConflictDoUpdate({
            target: chats.id,
            set: {
              title: sql.raw("EXCLUDED.title"),
              updatedAt: sql.raw("EXCLUDED.updated_at"),
              deleted: sql.raw("EXCLUDED.deleted"),
              activeBranch: sql.raw("EXCLUDED.active_branch"),
              pinned: sql.raw("EXCLUDED.pinned"),
            },
          });
      }

      // Insert messages
      if (body.messages.length) {
        body.messages.forEach((message: InferInsertModel<typeof messages>) => {
          message.userId = session.user.id;
          message.createdAt = coerceDate(message.createdAt);
          message.updatedAt = coerceDate(message.updatedAt);
        });
        await cloudDb
          .insert(messages)
          .values(body.messages)
          .onConflictDoUpdate({
            target: messages.id,
            set: {
              content: sql.raw("EXCLUDED.content"),
              usage: sql.raw("EXCLUDED.usage"),
              files: sql.raw("EXCLUDED.files"),
              knowledge: sql.raw("EXCLUDED.knowledge"),
              retrievedKnowledge: sql.raw("EXCLUDED.retrieved_knowledge"),
              childrenIds: sql.raw("EXCLUDED.children_ids"),
              updatedAt: sql.raw("EXCLUDED.updated_at"),
              deleted: sql.raw("EXCLUDED.deleted"),
            },
          });
      }

      // Insert user settings
      if (body.userSettings) {
        await cloudDb
          .insert(userSettings)
          .values({
            userId: user.id,
            settings: body.userSettings.settings,
            updatedAt: new Date(body.userSettings.updatedAt),
          })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: {
              settings: sql`EXCLUDED.settings`,
              updatedAt: sql`EXCLUDED.updated_at`,
            },
          });
      }

      // Insert global settings (admin-only)
      if (
        body.globalSettings &&
        (user.role === "admin" || user.role === "owner")
      ) {
        const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
        await cloudDb
          .insert(globalSettings)
          .values({
            id: GLOBAL_SETTINGS_ID,
            settings: body.globalSettings.settings,
            updatedAt: new Date(body.globalSettings.updatedAt),
          })
          .onConflictDoUpdate({
            target: globalSettings.id,
            set: {
              settings: sql`EXCLUDED.settings`,
              updatedAt: sql`EXCLUDED.updated_at`,
            },
          });
      }
      logger.debug("POST /api/sync: Insert successful");
    }

    // Select all the unsynced data from the cloud database
    const since = coerceDate(body.lastSyncTime);
    // Select chats
    const unsyncedChats = await cloudDb
      .select()
      .from(chats)
      .where(and(gt(chats.updatedAt, since), eq(chats.userId, user.id)));

    // Select messages
    const unsyncedMessages = await cloudDb
      .select()
      .from(messages)
      .where(and(gt(messages.updatedAt, since), eq(messages.userId, user.id)));

    // Select user settings
    const unsyncedUserSettingsRes = (await cloudDb
      .select()
      .from(userSettings)
      .where(
        and(
          eq(userSettings.userId, user.id),
          gt(
            userSettings.updatedAt,
            body.type === "login" ? new Date(0) : since,
          ),
        ),
      )) as InferSelectModel<typeof userSettings>[];

    // Select global settings
    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";
    const unsyncedGlobalSettingsRes = (await cloudDb
      .select()
      .from(globalSettings)
      .where(
        and(
          eq(globalSettings.id, GLOBAL_SETTINGS_ID),
          gt(
            globalSettings.updatedAt,
            body.type === "login" ? new Date(0) : since,
          ),
        ),
      )) as InferSelectModel<typeof globalSettings>[];

    logger.debug("POST /api/sync: Select successful");

    const data = {
      unsyncedChats,
      unsyncedMessages,
      unsyncedUserSettings: unsyncedUserSettingsRes.length
        ? unsyncedUserSettingsRes[0]
        : null,
      unsyncedGlobalSettings: unsyncedGlobalSettingsRes.length
        ? unsyncedGlobalSettingsRes[0]
        : null,
    };

    logger.debug(data, "POST /api/sync: Response data");
    return { success: true, data };
  } catch (error) {
    logger.error(error, "POST /api/sync: Error during sync");
    setResponseStatus(event, 500);
    return {
      success: false,
      message: "Sync failed",
    };
  }
});
