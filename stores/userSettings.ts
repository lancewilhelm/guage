import { defineStore } from "pinia";

interface UserSettings {
  theme?: string;
  favoriteThemes?: string[];
  model?: string;
}

export const useUserSettingsStore = defineStore(
  "userSettings",
  () => {
    const settings = ref<UserSettings>({});
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
