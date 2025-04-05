import { defineStore } from "pinia";

export interface Model {
  name: string;
  provider: string;
}

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
