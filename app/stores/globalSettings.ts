import { defineStore } from "pinia";
import { triggerDebouncedSync } from "~/utils/sync/debounce";

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

async function adminCheck() {
  const { user } = useAuth();
  if (user.value?.role !== "admin") {
    return false;
  }
  return true;
}

export const useGlobalSettingsStore = defineStore(
  "globalSettings",
  () => {
    const settings = ref<GlobalSettings>(defaultSettings);
    async function updateSettings(updated: Partial<GlobalSettings>) {
      if (!(await adminCheck())) return;

      // Update settings
      settings.value = { ...settings.value, ...updated };

      // Update sync status
      updatedAt.value = new Date();
      synced.value = false;

      // Trigger sync
      triggerDebouncedSync();
    }

    const synced = ref(true);
    async function setSynced(value: boolean) {
      await adminCheck();
      synced.value = value;
    }

    const updatedAt = ref<Date>(new Date());
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
