import { defineStore } from "pinia";
import { ref } from "vue";
import { localDb, type LocalChat, type LocalMessage } from "~/utils/db/local";
import type { SelectGlobalSettings } from "~/utils/db/schema";

export const useSyncStore = defineStore(
  "sync",
  () => {
    const isSyncing = ref(false);
    const lastSyncTime = ref<Date>(new Date(0));
    const syncError = ref<string | null>(null);

    async function doSyncAtLogin() {
      const { session } = useAuth();
      if (!session.value) return;

      isSyncing.value = true;
      syncError.value = null;

      try {
        const body = await getSyncBody("login");
        if (!body) {
          console.error("No data to sync");
          return;
        }
        logger.debug("Sync request body:", body);
        const response = await $fetch<SyncResponse>("/api/sync", {
          method: "POST",
          body,
        });

        if (response.success) {
          // Update synced status for messages, chats, and settings
          await updateSyncStatus(body, response);
          await processSyncResponse(response);

          lastSyncTime.value = new Date();
        }
      } catch (err) {
        syncError.value = "Sync failed. Try again.";
        console.error("Login sync error:", err);
      } finally {
        isSyncing.value = false;
      }
    }

    async function sync() {
      const { session } = useAuth();
      if (!session.value) return;

      isSyncing.value = true;
      syncError.value = null;

      try {
        const body = await getSyncBody("full", lastSyncTime.value);
        if (!body) {
          console.error("No data to sync");
          return;
        }

        logger.debug("Sync request body:", body);

        const response = await $fetch<SyncResponse>("/api/sync", {
          method: "POST",
          body,
        });

        if (response.success) {
          // Update synced status for messages, chats, and settings
          await updateSyncStatus(body, response);
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

    function pull() {
      lastSyncTime.value = new Date(0);
      sync();
    }

    function $reset() {
      isSyncing.value = false;
      lastSyncTime.value = new Date(0);
      syncError.value = null;
    }

    return {
      isSyncing,
      lastSyncTime,
      syncError,
      doSyncAtLogin,
      sync,
      pull,
      $reset,
    };
  },
  {
    persist: true,
  },
);

export type SyncRequest = {
  lastSyncTime: Date | null;
  type: string;
  chats: LocalChat[];
  messages: LocalMessage[];
  userSettings: { settings: UserSettings; updatedAt: Date } | null;
  globalSettings: { settings: GlobalSettings; updatedAt: Date } | null;
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

async function getSyncBody(type: string, lastSyncTime?: Date) {
  if (type === "full" && lastSyncTime) {
    const chats = await localDb.chatsTable
      .filter((chat) => !chat.synced)
      .toArray();
    const messages = await localDb.messagesTable
      .filter((msg) => !msg.synced)
      .toArray();
    const userSettingsStore = useUserSettingsStore();
    const globalSettingsStore = useGlobalSettingsStore();

    return {
      lastSyncTime: lastSyncTime,
      type: "full",
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
  } else if (type === "login") {
    const { user } = useAuth();
    if (!user.value) return null;
    const lastMsg = await localDb.messagesTable
      .where({
        userId: user.value.id,
      })
      .reverse()
      .sortBy("updatedAt")
      .then((messages) => messages[0]);
    const lastSyncTime = lastMsg?.updatedAt || new Date(0);
    return {
      lastSyncTime,
      type: "login",
      chats: [],
      messages: [],
      userSettings: null,
      globalSettings: null,
    };
  }
}

async function updateSyncStatus(body: SyncRequest, response: SyncResponse) {
  const { chats, messages } = body;
  const { unsyncedChats, unsyncedMessages } = response.data;

  for (const chat of chats) {
    if (!unsyncedChats.some((c) => c.id === chat.id)) {
      await localDb.chatsTable.update(chat.id, { synced: true });
    }
  }

  for (const message of messages) {
    if (!unsyncedMessages.some((m) => m.id === message.id)) {
      await localDb.messagesTable.update(message.id, { synced: true });
    }
  }

  const userSettingsStore = useUserSettingsStore();
  const globalSettingsStore = useGlobalSettingsStore();
  userSettingsStore.setSynced(true);
  globalSettingsStore.setSynced(true);
}
