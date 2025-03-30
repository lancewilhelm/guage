import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncStore } from "./syncStore";
import { Model } from "./globalSettingsStore";

export interface UserSettings {
  darkCode: boolean;
  favoriteThemes: string[];
  selectedModel: Model;
}

export interface UserSettingsState {
  settings: UserSettings;
  updatedAt: Date;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateFromSync: (syncedData: {
    settings: UserSettings;
    updatedAt: Date;
  }) => void;
}

const defaultSettings: UserSettings = {
  darkCode:
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  favoriteThemes: [],
  selectedModel: {
    name: "gpt-4o-mini",
    provider: "openai",
  },
};

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
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
