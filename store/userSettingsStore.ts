import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserSettings, UserSettingsState } from "./settingsTypes";
import { useSyncStore } from "./syncStore";

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      settings: { darkMode: false },
      updatedAt: new Date(),
      updateSettings: (newSettings: Partial<UserSettings>) => {
        const updatedTimestamp = new Date();
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          updatedAt: updatedTimestamp,
        }));
        useSyncStore.getState().sync();
      },
      updateFromSync: (syncedData: {
        settings: UserSettings;
        updatedAt: Date;
      }) => {
        const localLastUpdated = new Date(get().updatedAt);
        console.log("localLastUpdated:", localLastUpdated);
        console.log("syncedData.updatedAt:", syncedData.updatedAt);
        if (syncedData.updatedAt > localLastUpdated) {
          console.log("Updating user settings from sync:", syncedData);
          set({
            settings: syncedData.settings,
            updatedAt: syncedData.updatedAt,
          });
        }
      },
    }),
    { name: "user-settings" },
  ),
);
