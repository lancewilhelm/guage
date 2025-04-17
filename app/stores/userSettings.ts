import { defineStore } from "pinia";
import type { Model } from "~/utils/db/local";
import { triggerDebouncedSync } from "~/utils/sync/debounce";
export const messageDisplayModeOptions = [
  "markdown",
  "plaintext",
  "monospace",
] as const;
export type MessageDisplayMode = (typeof messageDisplayModeOptions)[number];

export interface UserSettings {
  theme?: string;
  favoriteThemes: string[];
  themeSorting: {
    sortedByName: boolean;
    reverseSort: boolean;
  };
  model?: Model;
  defaultSystemPrompt?: string;
  systemPrompts: {
    [key: string]: string;
  };
  currentSystemPrompt?: keyof UserSettings["systemPrompts"] | "default";
  messageDisplayMode: MessageDisplayMode;
}

const defaultSettings: UserSettings = {
  favoriteThemes: [],
  themeSorting: {
    sortedByName: false,
    reverseSort: false,
  },
  model: undefined,
  defaultSystemPrompt: "You are a helpful assistant.",
  systemPrompts: {},
  currentSystemPrompt: "default",
  messageDisplayMode: "markdown",
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

    const updatedAt = ref<Date>(new Date(0));
    const synced = ref(true);
    const setSynced = (value: boolean) => {
      synced.value = value;
    };

    function $reset() {
      settings.value = defaultSettings;
      updatedAt.value = new Date(0);
      synced.value = true;
    }

    return {
      settings,
      updatedAt,
      updateSettings,
      synced,
      setSynced,
      $reset,
    };
  },
  {
    persist: true,
  },
);
