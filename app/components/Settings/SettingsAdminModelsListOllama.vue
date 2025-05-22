<script setup lang="ts">
import type { Model } from "~/utils/db/local";
defineProps<{
  models: Model[];
  provider: string;
  isFetchingModels: boolean;
}>();

const emit = defineEmits<{
  (e: "fetchModels", urls: string[]): void;
}>();

const globalSettingsStore = useGlobalSettingsStore();
const availableModels = computed(() => {
  return globalSettingsStore.settings.availableModels;
});

const ollamaUrlToAdd = ref("");
const ollamaUrls = computed(() => {
  return globalSettingsStore.settings.ollamaUrls;
});
async function addOllamaUrl() {
  const url = ollamaUrlToAdd.value;
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
    globalSettingsStore.updateSettings({
      ollamaUrls: [...globalSettingsStore.settings.ollamaUrls, url],
    });
    ollamaUrlToAdd.value = "";
    emit("fetchModels", ollamaUrls.value);
  }
}

async function deleteOllamaUrl(url: string) {
  if (!url) {
    return;
  }

  // Delete models associated with the URL
  globalSettingsStore.updateSettings({
    availableModels: globalSettingsStore.settings.availableModels.filter(
      (m) => m.url !== url,
    ),
  });

  // Remove the URL from the settings
  globalSettingsStore.updateSettings({
    ollamaUrls: globalSettingsStore.settings.ollamaUrls.filter(
      (u) => u !== url,
    ),
  });
}

async function testOllamaUrl(url: string) {
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
    emit("fetchModels", ollamaUrls.value);
  }
}

const deleteOllamaModelModalVisible = ref(false);
const ollamaModelToDelete = ref<Model | null>(null);
async function deleteOllamaModel() {
  const model = ollamaModelToDelete.value;
  if (!model?.url || !model.name) {
    return;
  }
  const response = await $fetch<{ success: boolean; message: string }>(
    "/api/models/ollama",
    {
      method: "DELETE",
      body: { url: model.url, model: model.name },
    },
  );

  if (response.success) {
    // Remove the model from the available models
    globalSettingsStore.removeModelFromAvailableModels(model);
    emit("fetchModels", ollamaUrls.value);
    deleteOllamaModelModalVisible.value = false;
  }
}

// Pull model from ollama
const isPulling = ref<Record<string, boolean>>({});
const modelToPull = ref<Record<string, string>>({});
const pullStatus = ref<Record<string, string>>({});
const pullTotal = ref<Record<string, number>>({});
const pullCompleted = ref<Record<string, number>>({});
const pullPercent = ref<Record<string, number>>({});
async function pullOllamaModel(url: string) {
  if (!url) {
    return;
  }
  const model = modelToPull.value[url];
  if (!model) {
    return;
  }
  pullStatus.value[url] = "";

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

  isPulling.value[url] = true;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      emit("fetchModels", ollamaUrls.value);
      break;
    }

    const chunk = decoder.decode(value);
    const events = parseSSEChunk(chunk);
    for (const event of events) {
      if (event.eventType === "statusChunk") {
        const status = JSON.parse(event.data);
        pullStatus.value[url] = status.status;
        pullTotal.value[url] = status.total;
        pullCompleted.value[url] = status.completed;
        pullPercent.value[url] = status.total
          ? Math.round((status.completed / status.total) * 100)
          : 0;
      }
    }
  }
  modelToPull.value = {};
  isPulling.value[url] = false;
}
</script>

<template>
  <div>
    <div class="flex gap-2 items-center">
      <input
        v-model="ollamaUrlToAdd"
        type="text"
        placeholder="Ollama URL"
        class="border border-(--sub-color) rounded-lg p-2 w-full"
        @keyup.enter="addOllamaUrl"
      />
      <button
        class="bg-(--main-color) text-(--bg-color) p-2 rounded-lg px-4 text-nowrap"
        @click="addOllamaUrl"
      >
        add url
      </button>
    </div>
  </div>
  <div v-if="ollamaUrls">
    <div
      v-for="url in ollamaUrls"
      :key="url"
      class="flex flex-col w-full gap-2 mb-2"
    >
      <!-- url header -->
      <div class="flex items-center gap-2 w-full">
        <!-- name -->
        <div class="text-(--main-color)">
          {{ url }}
        </div>
        <Icon
          name="lucide:trash-2"
          class="text-(--sub-color) cursor-pointer shrink-0"
          @click="deleteOllamaUrl(url)"
        />

        <!-- pull model -->
        <div class="w-full grow">
          <div v-if="!isPulling[url]" class="flex gap-2 items-center">
            <input
              v-model="modelToPull[url]"
              type="text"
              placeholder="model name"
              class="border border-(--sub-color) rounded-lg p-1! w-full"
              @keyup.enter="pullOllamaModel(url)"
            />
            <button
              class="bg-(--main-color) text-(--bg-color) py-1! rounded-lg"
              @click="pullOllamaModel(url)"
            >
              pull
            </button>
          </div>

          <!-- pull status -->
          <div
            v-if="isPulling[url]"
            class="flex w-full grow gap-2 items-center text-(--sub-color)"
          >
            <div class="flex grow items-center gap-2">
              <div class="text-nowrap">{{ pullStatus[url] }}</div>
              <div
                v-if="pullTotal[url]"
                class="grow h-2 bg-(--sub-color) rounded-full"
              >
                <div
                  class="h-full bg-(--main-color) rounded-full"
                  :style="{
                    width: (pullPercent[url] || 0) + '%',
                  }"
                />
              </div>
              <div class="text-sm">{{ pullPercent[url] }}%</div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-[1px] bg-(--sub-color) w-full" />

      <!-- models -->
      <!-- Available models fallback -->
      <div v-if="!models.length" class="flex flex-col gap-1 mb-2">
        <div
          v-for="model in availableModels.filter(
            (m) => m.provider === provider && m.url === url,
          )"
          :key="model.name"
          class="flex gap-2"
        >
          <div
            class="w-6 h-6 rounded-lg border border-(--sub-color) cursor-pointer"
            :class="
              globalSettingsStore.checkAvailableModel(model)
                ? 'bg-(--main-color)'
                : 'bg-(--bg-color)'
            "
            @click="
              () => {
                globalSettingsStore.updateAvailableModels(model);
              }
            "
          />
          <HoverScrollText>{{ model.name }}</HoverScrollText>
        </div>
        <Icon
          v-if="isFetchingModels"
          name="svg-spinners:6-dots-scale"
          class="text-4xl self-center"
        />
      </div>

      <!-- fetched models -->
      <div class="mb-2 flex flex-col gap-1">
        <div
          v-for="model in models.filter((m) => m.url === url)"
          :key="model.name"
          class="flex gap-2 items-center"
        >
          <div
            class="w-6 h-6 rounded-lg border border-(--sub-color) cursor-pointer"
            :class="
              globalSettingsStore.checkAvailableModel(model)
                ? 'bg-(--main-color)'
                : 'bg-(--bg-color)'
            "
            @click="
              () => {
                globalSettingsStore.updateAvailableModels(model);
              }
            "
          />
          <HoverScrollText>{{ model.name }}</HoverScrollText>
          <Icon
            name="lucide:trash-2"
            class="text-(--sub-color) cursor-pointer"
            @click="
              () => {
                deleteOllamaModelModalVisible = true;
                ollamaModelToDelete = model;
              }
            "
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Ollama Model Modal -->
  <ModalWindow
    :open="deleteOllamaModelModalVisible"
    @close="
      () => {
        deleteOllamaModelModalVisible = false;
        ollamaModelToDelete = null;
      }
    "
  >
    <div class="flex flex-col items-center justify-center gap-2">
      <div class="text-(--text-color) text-lg text-center">
        Are you sure you want to delete {{ ollamaModelToDelete?.name }}? This
        action cannot be undone.
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
              ollamaModelToDelete = null;
            }
          "
        >
          cancel
        </button>
      </div>
    </div>
  </ModalWindow>
</template>
