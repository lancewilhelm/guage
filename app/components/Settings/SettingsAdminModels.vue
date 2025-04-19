<script setup lang="ts">
interface Models {
  openai: string[];
  ollama: string[];
}
const models = ref<Models>({
  openai: [],
  ollama: [],
});
async function fetchModels(provider: keyof Models) {
  const response = await $fetch<{ models: string[] }>(
    `/api/models/${provider}`,
  );
  models.value[provider] = response.models;
}
const globalSettingsStore = useGlobalSettingsStore();
const availableModels = computed(() => {
  return globalSettingsStore.settings.availableModels;
});
const availableModelNames = computed(() => {
  return globalSettingsStore.settings.availableModels.map((model) => {
    return model.name;
  });
});
const ollamaUrl = computed({
  get: () => {
    return globalSettingsStore.settings.ollamaUrl;
  },
  set: (value) => {
    globalSettingsStore.updateSettings({ ollamaUrl: value });
    ollamaTestStatus.value = null;
  },
});

const ollamaTestStatus = ref<"available" | "testing" | "unavailable" | null>(
  null,
);
async function testOllamaUrl() {
  const url = ollamaUrl.value;
  ollamaTestStatus.value = "testing";
  if (!url) {
    return;
  }
  const response = await $fetch<{ success: boolean; message: string }>(
    "/api/ollama/version",
    {
      method: "POST",
      body: { url },
    },
  );

  if (response.success) {
    ollamaTestStatus.value = "available";
    await fetchModels("ollama");
  } else {
    ollamaTestStatus.value = "unavailable";
  }
}

// Check the ollama endpoint on mount
onMounted(async () => {
  // Check if the ollama url is set
  if (ollamaUrl.value) {
    testOllamaUrl();
  }
  // Fetch the models
  fetchModels("openai");
});

const deleteOllamaModelModalVisible = ref(false);
const ollamaModelToDelete = ref("");
async function deleteOllamaModel() {
  const model = ollamaModelToDelete.value;
  const url = ollamaUrl.value;
  if (!url) {
    return;
  }
  const response = await $fetch<{ success: boolean; message: string }>(
    "/api/models/ollama",
    {
      method: "DELETE",
      body: { url, model },
    },
  );

  if (response.success) {
    ollamaTestStatus.value = "available";
    await fetchModels("ollama");
    deleteOllamaModelModalVisible.value = false;
  }
}

// Pull model from ollama
const isPulling = ref(false);
const modelToPull = ref("");
const pullStatus = ref("");
const pullTotal = ref(0);
const pullCompleted = ref(0);
const pullPercent = computed(() => {
  if (pullTotal.value === 0) {
    return 0;
  }
  return Math.round((pullCompleted.value / pullTotal.value) * 100);
});
async function pullOllamaModel() {
  const url = ollamaUrl.value;
  if (!url) {
    return;
  }
  const model = modelToPull.value;
  if (!model) {
    return;
  }
  pullStatus.value = "";

  const response = await fetch("/api/models/ollama/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      model,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to LLM provider");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  isPulling.value = true;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = parseSSEChunk(chunk);
    for (const event of events) {
      if (event.eventType === "statusChunk") {
        const status = JSON.parse(event.data);
        pullStatus.value = status.status;
        pullTotal.value = status.total;
        pullCompleted.value = status.completed;
      }
    }
  }
  modelToPull.value = "";
  isPulling.value = false;
  fetchModels("ollama");
}
</script>

<template>
  <div class="w-full">
    <SettingsGroup title="openai" icon="simple-icons:openai">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3">
        <div
          v-for="model in models?.openai.sort((a, b) => a.localeCompare(b))"
          :key="model"
          :class="[
            ' border border-(--main-color) rounded-full text-center truncate px-3 cursor-pointer ',
            availableModelNames.includes(model)
              ? 'bg-(--main-color) text-(--bg-color)'
              : 'text-(--text-color)',
          ]"
          @click="
            () =>
              globalSettingsStore.updateSettings({
                availableModels: availableModelNames.includes(model)
                  ? availableModels.filter((m) => m.name !== model)
                  : [...availableModels, { name: model, provider: 'openai' }],
              })
          "
        >
          {{ model }}
        </div>
      </div>
    </SettingsGroup>

    <SettingsGroup title="ollama" icon="simple-icons:ollama">
      <div class="flex items-center gap-2 mb-4">
        <div class="text-(--main-color)">url</div>
        <input
          v-model="ollamaUrl"
          type="text"
          placeholder="Ollama url"
          @keydown.enter="testOllamaUrl"
        />
        <button
          class="bg-(--sub-color) rounded px-3 py-1 cursor-pointer"
          @click="testOllamaUrl"
        >
          test
        </button>
        <div
          v-if="ollamaTestStatus === 'testing'"
          class="flex items-end gap-1 italic"
        >
          testing
          <Icon name="svg-spinners:3-dots-bounce" class="text-(--main-color)" />
        </div>
        <Icon
          v-if="ollamaTestStatus === 'available'"
          name="lucide:smile"
          class="text-(--yes-color) scale-125"
        />
        <Icon
          v-if="ollamaTestStatus === 'unavailable'"
          name="lucide:frown"
          class="text-(--no-color) scale-125"
        />
      </div>
      <div
        class="w-full grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3"
      >
        <div
          v-for="model in models?.ollama.sort((a, b) => a.localeCompare(b))"
          :key="model"
          :class="[
            'flex items-center justify-center gap-2 border border-(--main-color) rounded-full text-center truncate px-3 cursor-pointer ',
            availableModelNames.includes(model)
              ? 'bg-(--main-color) text-(--bg-color)'
              : 'text-(--text-color)',
          ]"
          @click="
            () =>
              globalSettingsStore.updateSettings({
                availableModels: availableModelNames.includes(model)
                  ? availableModels.filter((m) => m.name !== model)
                  : [...availableModels, { name: model, provider: 'ollama' }],
              })
          "
        >
          {{ model }}
          <Icon
            name="lucide:trash-2"
            class="text-(--text-color) ml-1"
            @click.stop.prevent="
              () => {
                ollamaModelToDelete = model;
                deleteOllamaModelModalVisible = true;
              }
            "
          />
        </div>
      </div>
      <SettingsSubGroup
        title="Pull model"
        icon="lucide:cloud-download"
        description="Pull a model from the Ollama server"
      >
        <div class="flex items-center gap-2 mb-4">
          <div class="text-(--main-color)">model tag</div>
          <input
            v-model="modelToPull"
            type="text"
            placeholder="model tag"
            class="disabled:opacity-50"
            :disabled="isPulling"
            @keydown.enter="pullOllamaModel"
          />
          <button
            class="bg-(--sub-color) rounded px-3 py-1 cursor-pointer disabled:opacity-50"
            :disabled="isPulling"
            @click="pullOllamaModel"
          >
            pull
          </button>
          <div class="flex gap-3 items-center">
            <div>{{ pullStatus }}</div>
            <div
              v-if="pullTotal"
              class="w-[200px] h-2 bg-(--sub-color) rounded-full"
            >
              <div
                class="h-full bg-(--main-color) rounded-full"
                :style="{
                  width: pullPercent + '%',
                }"
              />
            </div>
            <div v-if="pullTotal">{{ pullPercent }}%</div>
          </div>
        </div>
      </SettingsSubGroup>
    </SettingsGroup>

    <!-- Delete Ollama Model Modal -->
    <ModalWindow
      :open="deleteOllamaModelModalVisible"
      @close="
        () => {
          deleteOllamaModelModalVisible = false;
          ollamaModelToDelete = '';
        }
      "
    >
      <div class="flex flex-col items-center justify-center gap-2">
        <div class="text-(--text-color) text-lg text-center">
          Are you sure you want to delete {{ ollamaModelToDelete }}? This action
          cannot be undone.
        </div>
        <div class="flex gap-2 items-center">
          <button
            :class="[
              'flex items-center gap-2 mt-2 bg-(--error-color) text-(--bg-color) p-2 rounded-lg px-4',
            ]"
            @click="deleteOllamaModel"
          >
            delete
          </button>
          <button
            :class="[
              'flex items-center gap-2 mt-2 bg-(--main-color) text-(--bg-color) p-2 rounded-lg px-4',
            ]"
            @click="
              () => {
                deleteOllamaModelModalVisible = false;
                ollamaModelToDelete = '';
              }
            "
          >
            cancel
          </button>
        </div>
      </div>
    </ModalWindow>
  </div>
</template>
