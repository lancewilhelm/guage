import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionStore } from "./sessionStore";
import { GlobalSettings, GlobalSettingsState } from "./settingsTypes";
import { useSyncStore } from "./syncStore";

// Helper to check admin permissions
const isAdmin = (): boolean => {
  const session = useSessionStore.getState().session;
  if (!session) return false;
  return ["admin", "owner"].includes(session.user.role);
};

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set, get) => ({
      settings: { defaultModel: "gpt-4o-mini" },
      isSynced: true,
      updatedAt: new Date(),
      updateSettings: (newSettings: Partial<GlobalSettings>) => {
        if (!isAdmin()) {
          console.error(
            "Permission denied: only admin or owner can update global settings.",
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
