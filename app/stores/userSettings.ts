import { defineStore } from "pinia";
import type { Model } from "~/utils/db/local";
import { triggerDebouncedSync } from "~/utils/sync/debounce";

export const messageDisplayModeOptions = [
  "markdown",
  "plaintext",
  "monospace",
] as const;
export type MessageDisplayMode = (typeof messageDisplayModeOptions)[number];

export const fontFamilyOptions = [
  "Fira Code",
  "Geist",
  "IBM Plex Mono",
  "Inter",
  "Montserrat",
  "Nunito",
  "Poppins",
  "Roboto Mono",
] as const;
export type FontFamily = (typeof fontFamilyOptions)[number];

export const funboxModes = ["confetti", "snow"];
export type FunboxMode = (typeof funboxModes)[number];

export interface UserSettings {
  theme?: string;
  fontFamily: FontFamily;
  favoriteThemes: string[];
  themeSorting: {
    sortedByName: boolean;
    reverseSort: boolean;
  };
  model?: Model;
  titleModel?: Model;
  defaultSystemPrompt?: string;
  activeKnowledge?: string;
  systemPrompts: Record<string, string>;
  currentSystemPrompt?: keyof UserSettings["systemPrompts"] | "default";
  messageDisplayMode: MessageDisplayMode;
  chatSearchMode: "exact" | "fuzzy";
  funboxModes: FunboxMode[];
}

function getDefaultSettings(): UserSettings {
  return {
    fontFamily: "Geist",
    favoriteThemes: [],
    themeSorting: {
      sortedByName: false,
      reverseSort: false,
    },
    model: undefined,
    titleModel: undefined,
    defaultSystemPrompt: "You are a helpful assistant.",
    systemPrompts: {},
    currentSystemPrompt: "default",
    messageDisplayMode: "markdown",
    chatSearchMode: "fuzzy",
    funboxModes: [],
  };
}

export const useUserSettingsStore = defineStore(
  "userSettings",
  () => {
    const settings = ref<UserSettings>(getDefaultSettings());
    function updateSettings(updated: Partial<UserSettings>) {
      if (Object.keys(updated).length === 0) return;

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
      settings.value = getDefaultSettings();
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
