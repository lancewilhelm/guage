import { defineStore } from "pinia";
import type { Model } from "~/utils/db/local";
import { triggerDebouncedSync } from "~/utils/sync/debounce";

export interface GlobalSettings {
  availableModels: Model[];
  allowRegistration: boolean;
  allowFileUpload: boolean;
  ollamaUrls: string[];
  lmStudioEnabled: boolean;
}

function getDefaultSettings(): GlobalSettings {
  return {
    availableModels: [],
    allowRegistration: false,
    allowFileUpload: false,
    ollamaUrls: ["http://localhost:11434"],
    lmStudioEnabled: false,
  };
}

// async function adminCheck() {
//   const { user } = useAuth();
//   if (user.value?.role !== "admin") {
//     return false;
//   }
//   return true;
// }

export const useGlobalSettingsStore = defineStore(
  "globalSettings",
  () => {
    const settings = ref<GlobalSettings>(getDefaultSettings());
    async function updateSettings(updated: Partial<GlobalSettings>) {
      // if (!(await adminCheck())) return;

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
      // await adminCheck();
      synced.value = value;
    }

    const updatedAt = ref<Date>(new Date(0));

    function checkAvailableModel(model: Model) {
      if (model.url) {
        return settings.value.availableModels.some(
          (m) =>
            m.name === model.name &&
            m.provider === "ollama" &&
            m.url === model.url,
        );
      }
      return settings.value.availableModels.some((m) => m.name === model.name);
    }

    function addModelToAvailableModels(model: Model) {
      updateSettings({
        availableModels: [...settings.value.availableModels, { ...model }],
      });
    }

    function removeModelFromAvailableModels(model: Model) {
      updateSettings({
        availableModels: settings.value.availableModels.filter(
          (m) =>
            (m.name !== model.name && m.url === model.url) ||
            m.name !== model.name ||
            m.provider !== model.provider ||
            m.url !== model.url,
        ),
      });
    }

    function updateAvailableModels(model: Model) {
      if (checkAvailableModel(model)) {
        removeModelFromAvailableModels(model);
      } else {
        addModelToAvailableModels(model);
      }
    }

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
      checkAvailableModel,
      addModelToAvailableModels,
      removeModelFromAvailableModels,
      updateAvailableModels,
      $reset,
    };
  },
  {
    persist: true,
  },
);
