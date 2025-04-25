<script setup lang="ts">
import type { Model } from "~/utils/db/local";

interface Models {
  openai: Model[];
  gemini: Model[];
  anthropic: Model[];
  ollama: Record<string, Model[]>;
}
const models = ref<Models>({
  openai: [],
  gemini: [],
  anthropic: [],
  ollama: {},
});
async function fetchModels(provider: keyof Models, url?: string) {
  if (provider === "ollama" && url) {
    const response = await $fetch<{ models: Model[] }>(
      `/api/models/ollama?url=${encodeURIComponent(url)}`,
    );
    models.value.ollama[url] = response.models;
  } else if (
    provider === "openai" ||
    provider === "gemini" ||
    provider === "anthropic"
  ) {
    const response = await $fetch<{ models: Model[] }>(
      `/api/models/${provider}`,
    );
    models.value[provider] = response.models;
  }
}
const globalSettingsStore = useGlobalSettingsStore();
const availableModels = computed(() => {
  return globalSettingsStore.settings.availableModels;
});
function checkAvailableModel(model: Model) {
  if (model.url) {
    return availableModels.value.some(
      (m) =>
        m.name === model.name && m.provider === "ollama" && m.url === model.url,
    );
  }
  return availableModels.value.some((m) => m.name === model.name);
}

function addModelToAvailableModels(model: Model) {
  globalSettingsStore.updateSettings({
    availableModels: [...availableModels.value, { ...model }],
  });
}
function removeModelFromAvailableModels(model: Model) {
  globalSettingsStore.updateSettings({
    availableModels: availableModels.value.filter(
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

function checkModelAgainstEndpoint(model: Model) {
  if (model.url) {
    return models.value.ollama[model.url]?.some((m) => m.name === model.name);
  }
  return (
    models.value.openai.some((m) => m.name === model.name) ||
    models.value.gemini.some((m) => m.name === model.name) ||
    models.value.anthropic.some((m) => m.name === model.name)
  );
}

const ollamaUrlToAdd = ref("");
const ollamaUrls = ref<{ [key: string]: boolean }>({});
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
    await fetchModels("ollama", url);
  }
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
    ollamaUrls.value[url] = true;
    await fetchModels("ollama", url);
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
    removeModelFromAvailableModels(model);
    await fetchModels("ollama", model.url);
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
    if (done) break;

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
  fetchModels("ollama", url);
}

const openaiAvailable = ref(false);
const geminiAvailable = ref(false);
const anthropicAvailable = ref(false);
// Check the ollama endpoint on mount
onMounted(async () => {
  // Check if the ollama url is set
  if (globalSettingsStore.settings.ollamaUrls) {
    for (const url of globalSettingsStore.settings.ollamaUrls) {
      testOllamaUrl(url);
    }
    // Fetch the models
    const response = await $fetch<{ providers: string[] }>("/api/providers");
    if (response.providers.includes("openai")) {
      openaiAvailable.value = true;
      fetchModels("openai");
    }
    if (response.providers.includes("gemini")) {
      geminiAvailable.value = true;
      fetchModels("gemini");
    }
    if (response.providers.includes("anthropic")) {
      anthropicAvailable.value = true;
      fetchModels("anthropic");
    }
  }
});
</script>

<template>
  <div class="w-full">
    <!-- OpenAI -->
    <SettingsGroup
      v-if="openaiAvailable"
      title="openai"
      icon="simple-icons:openai"
    >
      <div
        class="w-full grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3"
      >
        <div
          v-for="model in models?.openai.sort((a, b) =>
            a.name.localeCompare(b.name),
          )"
          :key="model.name"
          :class="[
            'flex  border border-(--main-color) rounded-full px-3 cursor-pointer ',
            checkAvailableModel(model)
              ? 'bg-(--main-color) text-(--bg-color)'
              : 'text-(--text-color)',
          ]"
          @click="updateAvailableModels(model)"
        >
          <HoverScrollText>{{ model.name }}</HoverScrollText>
        </div>
      </div>
    </SettingsGroup>

    <!-- Gemini -->
    <SettingsGroup
      v-if="geminiAvailable"
      title="gemini"
      icon="simple-icons:googlegemini"
    >
      <div
        class="w-full grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3"
      >
        <div
          v-for="model in models?.gemini.sort((a, b) =>
            a.name.localeCompare(b.name),
          )"
          :key="model.name"
          :class="[
            'flex  border border-(--main-color) rounded-full px-3 cursor-pointer ',
            checkAvailableModel(model)
              ? 'bg-(--main-color) text-(--bg-color)'
              : 'text-(--text-color)',
          ]"
          @click="updateAvailableModels(model)"
        >
          <HoverScrollText>{{ model.name }}</HoverScrollText>
        </div>
      </div>
    </SettingsGroup>

    <!-- Anthropic -->
    <SettingsGroup
      v-if="anthropicAvailable"
      title="anthropic"
      icon="simple-icons:anthropic"
    >
      <div
        class="w-full grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3"
      >
        <div
          v-for="model in models?.anthropic.sort((a, b) =>
            a.name.localeCompare(b.name),
          )"
          :key="model.name"
          :class="[
            'flex  border border-(--main-color) rounded-full px-3 cursor-pointer ',
            checkAvailableModel(model)
              ? 'bg-(--main-color) text-(--bg-color)'
              : 'text-(--text-color)',
          ]"
          @click="updateAvailableModels(model)"
        >
          <HoverScrollText>{{ model.name }}</HoverScrollText>
        </div>
      </div>
    </SettingsGroup>

    <SettingsGroup title="ollama" icon="simple-icons:ollama">
      <div class="flex items-center gap-2 mb-4">
        <div class="text-(--main-color)">add url</div>
        <input
          v-model="ollamaUrlToAdd"
          type="text"
          placeholder="Ollama url"
          @keydown.enter="addOllamaUrl"
        />
        <button
          class="bg-(--sub-color) rounded px-2! py-1! cursor-pointer"
          @click="addOllamaUrl"
        >
          add
        </button>
      </div>
      <div
        v-for="url in globalSettingsStore.settings.ollamaUrls"
        :key="url"
        class="w-full flex flex-col gap-2 mb-4"
      >
        <div class="h-[1px] bg-(--main-color) rounded-full" />
        <div class="flex gap-2 text-(--main-color) items-center mb-2">
          <div class="border-b">{{ url }}</div>
          <button
            class="bg-(--bg-color) text-(--error-color) rounded px-1! py-1! cursor-pointer"
            @click.prevent.stop="
              () => {
                globalSettingsStore.updateSettings({
                  ollamaUrls: globalSettingsStore.settings.ollamaUrls.filter(
                    (u) => u !== url,
                  ),
                });
              }
            "
          >
            <Icon name="lucide:trash-2" />
          </button>
          <Icon
            v-if="ollamaUrls[url]"
            name="lucide:check"
            class="text-(--yes-color) text-xl"
          />
          <Icon v-else name="lucide:x" class="text-(--no-color) text-xl" />
        </div>
        <div v-if="ollamaUrls[url]" class="flex items-center gap-2 mb-4">
          <div class="text-(--main-color)">pull model</div>
          <input
            v-model="modelToPull[url]"
            type="text"
            placeholder="model tag"
            class="disabled:opacity-50"
            :disabled="isPulling[url]"
            @keydown.enter="() => pullOllamaModel(url)"
          />
          <button
            class="bg-(--sub-color) rounded px-2! py-1! cursor-pointer disabled:opacity-50"
            :disabled="isPulling[url]"
            @click="() => pullOllamaModel(url)"
          >
            pull
          </button>
          <div class="flex gap-3 items-center">
            <div>{{ pullStatus[url] }}</div>
            <div
              v-if="pullTotal[url]"
              class="w-[200px] h-2 bg-(--sub-color) rounded-full"
            >
              <div
                class="h-full bg-(--main-color) rounded-full"
                :style="{
                  width: (pullPercent[url] || 0) + '%',
                }"
              />
            </div>
            <div v-if="pullTotal[url]">{{ pullPercent[url] || 0 }}%</div>
          </div>
        </div>
        <div
          v-if="ollamaUrls[url]"
          class="w-full grid grid-cols-2 md:grid-cols-3 gap-2 text-nowrap mb-3"
        >
          <div
            v-for="model in (models?.ollama[url] || []).sort((a, b) =>
              a.name.localeCompare(b.name),
            )"
            :key="model.name"
            :class="[
              'flex items-center justify-between gap-2 border border-(--main-color) rounded-full text-center truncate px-3 cursor-pointer',
              checkAvailableModel(model)
                ? 'bg-(--main-color) text-(--bg-color)'
                : 'text-(--text-color)',
            ]"
            @click="updateAvailableModels(model)"
          >
            <HoverScrollText>{{ model.name }}</HoverScrollText>
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
      </div>
    </SettingsGroup>
    <SettingsGroup
      v-if="availableModels.filter((m) => !checkModelAgainstEndpoint(m)).length"
      title="leftover models"
      icon="lucide:alert-triangle"
      description="these models are currently not available via an api endpoint, but are still present in the system."
    >
      <div
        v-for="model in availableModels.filter(
          (m) => !checkModelAgainstEndpoint(m),
        )"
        :key="model.name"
        class="flex items-center gap-2 mb-4"
      >
        <div class="text-(--main-color)">{{ model.name }}</div>
        <div class="text-(--sub-color)">{{ model.provider }}</div>
        <div v-if="model.url" class="text-(--sub-color)">{{ model.url }}</div>
        <button
          class="bg-(--bg-color) text-(--error-color) rounded px-1! py-1! cursor-pointer"
          @click.prevent.stop="
            () => {
              removeModelFromAvailableModels(model);
            }
          "
        >
          <Icon name="lucide:trash-2" />
        </button>
      </div>
    </SettingsGroup>

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
  </div>
</template>
