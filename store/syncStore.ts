import { create } from "zustand";
import { LocalChat, LocalMessage } from "@/utils/db/local";
import { cloudPull, cloudPush } from "@/utils/db/sync";
import { logger } from "@/utils/logger";
import { AllSettings } from "./settingsTypes";

// Define the types for sync events and status.
export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type SyncOperation = "push" | "pull" | "two-way";
export type SyncEventType =
  | "chatsUpdated"
  | "messagesUpdated"
  | "settingsUpdated"
  | "syncComplete"
  | "syncError";

export interface SyncEventPayloads {
  chatsUpdated: LocalChat[];
  messagesUpdated: LocalMessage[];
  settingsUpdated: AllSettings;
  syncComplete: void;
  syncError: Error;
}

export type SyncEventListener<T extends SyncEventType = SyncEventType> = (
  eventType: T,
  data?: SyncEventPayloads[T],
) => void;

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  lastError: Error | null;
  lastOperation: SyncOperation | null;
  // Latest updates from a sync operation.
  updatedChats: LocalChat[];
  updatedMessages: LocalMessage[];
  updatedSettings: AllSettings;

  // Sync actions.
  sync: () => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;

  // Event subscription.
  subscribe: (listener: SyncEventListener) => () => void;
}

export const useSyncStore = create<SyncState>((set) => {
  // Listeners that want to react to sync events.
  const listeners: SyncEventListener[] = [];
  const notify = <T extends SyncEventType>(
    type: T,
    data?: SyncEventPayloads[T],
  ) => {
    listeners.forEach((listener) => listener(type, data));
  };

  return {
    status: "idle",
    lastSyncTime: null,
    lastError: null,
    lastOperation: null,
    updatedChats: [] as LocalChat[],
    updatedMessages: [] as LocalMessage[],
    updatedSettings: {} as AllSettings,

    // Two-way sync: push local changes then pull remote ones.
    sync: async () => {
      try {
        set({ status: "syncing", lastOperation: "two-way" });
        await cloudPush();
        const { updatedChats, updatedMessages, updatedSettings } =
          await cloudPull();
        set({
          status: "success",
          lastSyncTime: new Date(),
          updatedChats,
          updatedMessages,
          updatedSettings,
          lastError: null,
        });
        // Notify listeners.
        if (updatedChats.length > 0) notify("chatsUpdated", updatedChats);
        if (updatedMessages.length > 0)
          notify("messagesUpdated", updatedMessages);
        if (Object.keys(updatedSettings).length > 0)
          notify("settingsUpdated", updatedSettings);
        notify("syncComplete");
      } catch (error) {
        logger.error("Sync failed:", error);
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        set({ status: "error", lastError: typedError });
        notify("syncError", typedError);
      }
    },

    push: async () => {
      set({ status: "syncing", lastOperation: "push" });
      try {
        await cloudPush();
        set({ status: "success", lastSyncTime: new Date(), lastError: null });
        notify("syncComplete");
      } catch (error) {
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        set({ status: "error", lastError: typedError });
        notify("syncError", typedError);
      }
    },

    pull: async () => {
      set({ status: "syncing", lastOperation: "pull" });
      try {
        const { updatedChats, updatedMessages, updatedSettings } =
          await cloudPull();
        logger.debug("Pull sync complete:", {
          updatedChats,
          updatedMessages,
          updatedSettings,
        });
        set({
          status: "success",
          lastSyncTime: new Date(),
          updatedChats,
          updatedMessages,
          updatedSettings,
          lastError: null,
        });
        if (updatedChats.length > 0) notify("chatsUpdated", updatedChats);
        if (updatedMessages.length > 0)
          notify("messagesUpdated", updatedMessages);
        if (Object.keys(updatedSettings).length > 0)
          notify("settingsUpdated", updatedSettings);
        notify("syncComplete");
      } catch (error) {
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        set({ status: "error", lastError: typedError });
        notify("syncError", typedError);
      }
    },

    subscribe: (listener: SyncEventListener) => {
      listeners.push(listener);
      // Return an unsubscribe function.
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
  };
});
