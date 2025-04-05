import { defineStore } from "pinia";

const { data: session } = await authClient.useSession(useFetch);

export interface GlobalSettings {
  availableModels: {
    name: string;
    provider: string;
  }[];
  ollamaUrl?: string;
}

const defaultSettings: GlobalSettings = {
  availableModels: [],
};

export const useGlobalSettingsStore = defineStore(
  "globalSettings",
  () => {
    const settings = ref<GlobalSettings>(defaultSettings);
    function updateSettings(updated: Partial<GlobalSettings>) {
      if (session.value?.user.role !== "admin") return;
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
