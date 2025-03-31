import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionStore } from "./sessionStore";
import { useSyncStore } from "./syncStore";

export interface Model {
  name: string;
  provider: string;
}

export interface GlobalSettings {
  allowRegistration: boolean;
  ollamaUrl: string;
  availableModels: Model[];
}

export interface GlobalSettingsState {
  settings: GlobalSettings;
  isSynced: boolean;
  updatedAt: Date;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
  updateFromSync: (syncedData: {
    settings: GlobalSettings;
    updatedAt: Date;
  }) => void;
}

// Helper to check admin permissions
const isAdmin = (): boolean => {
  const session = useSessionStore.getState().session;
  if (!session) return false;
  return session.user.role === "admin";
};

// Default settings
const defaultSettings: GlobalSettings = {
  allowRegistration: false,
  ollamaUrl: "http://localhost:11434",
  availableModels: [
    {
      name: "gpt-4o-mini",
      provider: "openai",
    },
  ],
};

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isSynced: true,
      updatedAt: new Date(),
      updateSettings: (newSettings: Partial<GlobalSettings>) => {
        if (!isAdmin()) {
          console.error(
            "Permission denied: only admin can update global settings.",
          );
          return;
        }
        const updatedTimestamp = new Date();
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          isSynced: false,
          updatedAt: updatedTimestamp,
        }));
        useSyncStore.getState().sync();
      },
      updateFromSync: (syncedData: {
        settings: GlobalSettings;
        updatedAt: Date;
      }) => {
        const localLastUpdated = new Date(get().updatedAt);
        // Accept the incoming update only if it's newer
        if (syncedData.updatedAt > localLastUpdated) {
          set({
            settings: syncedData.settings,
            isSynced: true,
            updatedAt: syncedData.updatedAt,
          });
        }
      },
    }),
    { name: "global-settings" },
  ),
);
