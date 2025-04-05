// ~/stores/sync.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { localDb, type LocalChat, type LocalMessage } from "~/utils/db/local";
import type { SelectGlobalSettings } from "~/utils/db/schema";

export const useSyncStore = defineStore(
  "sync",
  () => {
    const isSyncing = ref(false);
    const lastSyncTime = ref<Date | null>(null);
    const syncError = ref<string | null>(null);

    async function syncAll() {
      logger.debug("Syncing all data...");
      isSyncing.value = true;
      syncError.value = null;

      try {
        const chats = await localDb.chatsTable
          .filter((chat) => !chat.synced)
          .toArray();
        const messages = await localDb.messagesTable
          .filter((msg) => !msg.synced)
          .toArray();
        const userSettingsStore = useUserSettingsStore();
        const globalSettingsStore = useGlobalSettingsStore();

        const body = {
          lastSyncTime: lastSyncTime.value,
          chats: chats,
          messages: messages,
          userSettings: !userSettingsStore.synced
            ? {
                settings: userSettingsStore.settings,
                updatedAt: userSettingsStore.updatedAt,
              }
            : null,
          globalSettings: !globalSettingsStore.synced
            ? {
                settings: globalSettingsStore.settings,
                updatedAt: globalSettingsStore.updatedAt,
              }
            : null,
        };
        logger.debug("Sync request body:", body);

        const response = await $fetch<SyncResponse>("/api/sync", {
          method: "POST",
          body,
        });

        if (response.success) {
          // Update synced status for messages, chats, and settings
          for (const msg of messages) {
            await localDb.messagesTable.update(msg.id, { synced: true });
          }
          for (const chat of chats) {
            await localDb.chatsTable.update(chat.id, { synced: true });
          }
          const userSettingsStore = useUserSettingsStore();
          const globalSettingsStore = useGlobalSettingsStore();
          userSettingsStore.setSynced(true);
          globalSettingsStore.setSynced(true);
          await processSyncResponse(response);

          lastSyncTime.value = new Date();
        }
      } catch (err) {
        syncError.value = "Sync failed. Try again.";
        console.error("Full sync error:", err);
      } finally {
        isSyncing.value = false;
      }
    }

    return {
      isSyncing,
      lastSyncTime,
      syncError,
      syncAll,
    };
  },
  {
    persist: true,
  },
);

export type SyncRequest = {
  lastSyncTime: Date | null;
  chats: LocalChat[];
  messages: LocalMessage[];
  userSettings: UserSettings | null;
  globalSettings: GlobalSettings | null;
};

export type SyncResponse = {
  success: boolean;
  data: {
    unsyncedChats: LocalChat[];
    unsyncedMessages: LocalMessage[];
    unsyncedUserSettings: SelectGlobalSettings | null;
    unsyncedGlobalSettings: SelectGlobalSettings | null;
  };
};

async function processSyncResponse(response: SyncResponse) {
  const {
    unsyncedChats,
    unsyncedMessages,
    unsyncedUserSettings,
    unsyncedGlobalSettings,
  } = response.data;

  logger.debug("Processing sync response:", {
    unsyncedChats,
    unsyncedMessages,
    unsyncedUserSettings,
    unsyncedGlobalSettings,
  });

  const chatStore = useChatStore();

  // Chats
  for (const remoteChat of unsyncedChats) {
    const normalizedChat = {
      ...remoteChat,
      createdAt: new Date(remoteChat.createdAt),
      updatedAt: new Date(remoteChat.updatedAt),
      synced: true,
    };
    await localDb.chatsTable.put(normalizedChat);
    chatStore.upsertChatFromSync(normalizedChat);
  }

  // Messages
  for (const remoteMsg of unsyncedMessages) {
    const normalizedMsg = {
      ...remoteMsg,
      createdAt: new Date(remoteMsg.createdAt),
      updatedAt: new Date(remoteMsg.updatedAt),
      synced: true,
    };
    await localDb.messagesTable.put(normalizedMsg);
    chatStore.upsertMessageFromSync(remoteMsg.chatId, normalizedMsg);
  }

  // --- Process settings ---
  if (unsyncedUserSettings) {
    const userSettingsStore = useUserSettingsStore();
    userSettingsStore.updateSettings(
      unsyncedUserSettings.settings as Partial<UserSettings>,
    );
  }

  if (unsyncedGlobalSettings) {
    const globalSettingsStore = useGlobalSettingsStore();
    globalSettingsStore.updateSettings(
      unsyncedGlobalSettings.settings as Partial<GlobalSettings>,
    );
  }
}
