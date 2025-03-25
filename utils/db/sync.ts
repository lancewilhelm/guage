import { useSyncStore } from "@/store/syncStore";
import { logger } from "@/utils/logger";
import { debounce } from "@/utils/debounce";
import { localDb } from "./local";
import { useUserSettingsStore } from "@/store/userSettingsStore";
import { useGlobalSettingsStore } from "@/store/globalSettingsStore";

/**
 * Push local unsynced chats, including deleted flags.
 */
async function cloudPushChats() {
  const unsyncedChats = await localDb.chatsTable
    .filter((chat) => !chat.synced)
    .toArray();
  if (unsyncedChats.length === 0) return;
  try {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unsyncedChats }),
    });
    if (response.ok) {
      // Mark chats as synced locally.
      const update = unsyncedChats.map((chat) => ({
        key: chat.id,
        changes: { synced: true },
      }));
      await localDb.chatsTable.bulkUpdate(update);
    } else {
      logger.error("Server error syncing chats:", unsyncedChats);
    }
  } catch (error) {
    logger.error("Sync failed for chats:", unsyncedChats, error);
  }
}

/**
 * Push local unsynced messages, including deleted flags.
 */
async function cloudPushMessages() {
  const unsyncedMessages = await localDb.messagesTable
    .filter((msg) => !msg.synced)
    .toArray();
  if (unsyncedMessages.length === 0) return;
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unsyncedMessages }),
    });
    if (response.ok) {
      // Mark messages as synced locally.
      const update = unsyncedMessages.map((msg) => ({
        key: msg.id,
        changes: { synced: true },
      }));
      await localDb.messagesTable.bulkUpdate(update);
    } else {
      logger.error("Server error syncing messages:", unsyncedMessages);
    }
  } catch (error) {
    logger.error("Sync failed for messages:", unsyncedMessages, error);
  }
}

/**
 * Push local settings to the server.
 *
 * Expects both user and global settings (if applicable) with a lastUpdated timestamp.
 */
async function cloudPushSettings(): Promise<void> {
  try {
    // Import stores directly to avoid circular dependencies.

    const userStore = useUserSettingsStore.getState();
    const globalStore = useGlobalSettingsStore.getState();

    const user =
      userStore.updatedAt > (useSyncStore.getState().lastSyncTime ?? new Date())
        ? userStore
        : null;

    const admin =
      globalStore.updatedAt >
      (useSyncStore.getState().lastSyncTime ?? new Date())
        ? globalStore
        : null;

    // Construct the payload.
    const payload = {
      user,
      admin,
    };

    if (!user && !admin) return;

    console.log("Pushing settings to cloud:", payload);

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to push settings: ${response.status}`);
    }
    logger.info("Settings pushed to cloud successfully");
  } catch (error) {
    logger.error("Failed to push settings to cloud", error);
  }
}

/**
 * Push local changes to the server.
 */
export async function cloudPush() {
  await cloudPushChats();
  await cloudPushMessages();
  await cloudPushSettings();
}

/**
 * Pull remote changes from the server.
 *
 * It sends the last sync time as a query parameter and then processes messages, chats,
 * and settings from the response.
 */
export async function cloudPull() {
  // Use the last sync time from the sync store (or now if none exists).
  const lastSync =
    useSyncStore.getState().lastSyncTime?.toISOString() ||
    new Date().toISOString();
  try {
    const response = await fetch(
      `/api/sync?since=${encodeURIComponent(lastSync)}`,
    );
    if (response.ok) {
      const data = await response.json();
      const { messages, chats, settings } = data;

      const updatedMessages = [];
      const updatedChats = [];

      // Process remote messages
      for (const remoteMsg of messages) {
        const localMsg = await localDb.messagesTable.get(remoteMsg.id);
        if (!localMsg || new Date(remoteMsg.updatedAt) > localMsg.updatedAt) {
          const processedMessage = {
            ...remoteMsg,
            createdAt: new Date(remoteMsg.createdAt),
            updatedAt: new Date(remoteMsg.updatedAt),
          };
          await localDb.messagesTable.put(processedMessage);
          updatedMessages.push(processedMessage);
        }
      }

      // Process remote chats
      for (const remoteChat of chats) {
        const localChat = await localDb.chatsTable.get(remoteChat.id);
        if (
          !localChat ||
          new Date(remoteChat.updatedAt) > localChat.updatedAt
        ) {
          const processedChat = {
            ...remoteChat,
            createdAt: new Date(remoteChat.createdAt),
            updatedAt: new Date(remoteChat.updatedAt),
          };
          await localDb.chatsTable.put(processedChat);
          updatedChats.push(processedChat);
        }
      }

      // Process settings if they exist.
      // The settings payload contains separate "user" and "global" objects.
      const updatedSettings = settings ? settings : undefined;
      if (updatedSettings.user.updatedAt) {
        updatedSettings.user.updatedAt = new Date(
          updatedSettings.user.updatedAt,
        );
      }
      if (updatedSettings.global.updatedAt) {
        updatedSettings.global.updatedAt = new Date(
          updatedSettings.global.updatedAt,
        );
      }

      return { updatedMessages, updatedChats, updatedSettings };
    } else {
      logger.error("Pull sync failed with status:", response.status);
      return { updatedMessages: [], updatedChats: [], updatedSettings: {} };
    }
  } catch (error) {
    logger.error("Pull sync error:", error);
    return { updatedMessages: [], updatedChats: [], updatedSettings: {} };
  }
}

/**
 * Perform a two-way sync with the server.
 */
export async function cloudSync() {
  await cloudPush();
  await cloudPull();
}

/**
 * Debounced version of two-way sync function.
 */
export const cloudDebouncedSync = debounce(cloudSync, 500);
