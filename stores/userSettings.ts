import { defineStore } from "pinia";

interface UserSettings {
  theme?: string;
  favoriteThemes?: string[];
  themeSorting?: {
    sortedByName?: boolean;
    reverseSort?: boolean;
  };
  model?: string;
}

export const useUserSettingsStore = defineStore(
  "userSettings",
  () => {
    const settings = ref<UserSettings>({
      themeSorting: {
        sortedByName: false,
        reverseSort: false,
      },
    });
    function updateSettings(updated: Partial<UserSettings>) {
      settings.value = { ...settings.value, ...updated };
    }

    return {
      settings,
      updateSettings,
    };
  },
  {
    persist: {
      storage: localStorage,
    },
  },
);
