import { defineStore } from "pinia";
import type { Model } from "~/utils/db/local";
import { triggerDebouncedSync } from "~/utils/sync/debounce";

export interface UserSettings {
  theme?: string;
  favoriteThemes: string[];
  themeSorting: {
    sortedByName: boolean;
    reverseSort: boolean;
  };
  model?: Model;
}

const defaultSettings: UserSettings = {
  favoriteThemes: [],
  themeSorting: {
    sortedByName: false,
    reverseSort: false,
  },
};

export const useUserSettingsStore = defineStore(
  "userSettings",
  () => {
    const settings = ref<UserSettings>(defaultSettings);
    function updateSettings(updated: Partial<UserSettings>) {
      if (Object.keys(updated).length === 0) return;

      // Change theme if it is not the same as the current one
      if (updated.theme && settings.value.theme !== updated.theme) {
        loadTheme(updated.theme);
      }
      // Update the settings
      settings.value = { ...settings.value, ...updated };

      // Update sync status
      updatedAt.value = new Date();
      synced.value = false;

      // Trigger sync
      triggerDebouncedSync();
    }

    const updatedAt = ref<Date>(new Date());
    const synced = ref(false);
    const setSynced = (value: boolean) => {
      synced.value = value;
    };

    return {
      settings,
      updatedAt,
      updateSettings,
      synced,
      setSynced,
    };
  },
  {
    persist: true,
  },
);
