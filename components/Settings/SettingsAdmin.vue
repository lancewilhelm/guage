<script setup lang="ts">
interface ModelsResponse {
  openaiModels: string[];
  ollamaModels: string[];
}
const { data: models } = useFetch<ModelsResponse>("/api/models");
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

const ollamaTestStatus = ref<boolean | null>(null);
async function testOllamaUrl() {
  const url = ollamaUrl.value;
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
    ollamaTestStatus.value = true;
  } else {
    ollamaTestStatus.value = false;
  }
}

// Check the ollama endpoint on mount
onMounted(() => {
  // Check if the ollama url is set
  if (ollamaUrl.value) {
    testOllamaUrl();
  }
});
</script>

<template>
  <div class="w-full">
    <SettingsGroup
      title="Models"
      icon="lucide:bot"
      description="Select what models are available to the users"
    >
      <div
        class="flex gap-1 items-center fill-(--main-color) text-(--main-color) text-lg border-b border-(--sub-color) mb-3 px-2"
      >
        <OpenAiIcon />
        openai
      </div>
      <div class="grid grid-cols-3 gap-2 text-nowrap mb-3">
        <div
          v-for="model in models?.openaiModels.sort((a, b) =>
            a.localeCompare(b),
          )"
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

      <div
        class="flex gap-1 items-center fill-(--main-color) text-(--main-color) text-lg border-b border-(--sub-color) mb-3 px-2"
      >
        <OllamaIcon />
        ollama
      </div>
      <div class="flex items-center gap-2">
        <div class="text-(--main-color)">url</div>
        <input
          v-model="ollamaUrl"
          type="text"
          class="border border-(--main-color) rounded px-3 py-1"
          placeholder="Ollama url"
        />
        <button
          class="bg-(--sub-color) rounded px-3 py-1 cursor-pointer"
          @click="testOllamaUrl"
        >
          test
        </button>
        <Icon
          v-if="ollamaTestStatus"
          name="lucide:smile"
          class="text-(--yes-color) scale-125"
        />
        <Icon
          v-if="ollamaTestStatus === false"
          name="lucide:frown"
          class="text-(--no-color) scale-125"
        />
      </div>
    </SettingsGroup>
  </div>
</template>
