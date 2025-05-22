<script setup lang="ts">
import type { Model } from "~/utils/db/local";
import { providers } from "~/utils/llm/providers";

async function fetchModels(provider: string, urls?: string[]) {
  if (provider === "ollama" && urls) {
    const response = await $fetch<Model[]>("/api/models", {
      query: {
        provider: "ollama",
        urls,
      },
    });
    return response.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const response = await $fetch<Model[]>("/api/models", {
      query: {
        provider,
      },
    });
    if (response.length === 0) {
      return [];
    } else {
      return response.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
}

// Available models helpers
const selectedProvider = ref<string | null>(null);
const providerModels = ref<Model[]>([]);
const isFetchingModels = ref(false);
async function selectProvider(provider: string) {
  if (selectedProvider.value === provider) {
    selectedProvider.value = null;
    providerModels.value = [];
  } else {
    selectedProvider.value = provider;
    providerModels.value = [];
    isFetchingModels.value = true;
    providerModels.value = await fetchModels(provider);
    isFetchingModels.value = false;
  }
}
</script>

<template>
  <div class="w-full h-full overflow-hidden">
    <!-- Available Models -->
    <SettingsGroup
      title="available models"
      description="select models to make available to users"
      icon="lucide:cpu"
      class="h-full"
    >
      <div
        class="w-full h-full flex border border-(--sub-color) rounded-lg overflow-hidden"
      >
        <!-- Provider List -->
        <div class="flex flex-col border-r border-(--sub-color) shrink-0 w-48">
          <div class="flex flex-col">
            <div
              v-for="provider in providers"
              :key="provider.id"
              tabindex="0"
              class="flex items-center gap-2 cursor-pointer p-2"
              :class="[selectedProvider === provider.id && 'bg-(--sub-color)']"
              @click="selectProvider(provider.id)"
            >
              <Icon :name="provider.icon" class="text-(--main-color) text-xl" />
              <div class="text-(--main-color)">{{ provider.displayName }}</div>
            </div>
          </div>
        </div>

        <!-- Models List (not ollama)-->
        <div
          v-if="selectedProvider && selectedProvider !== 'ollama'"
          class="w-full flex flex-col gap-2 p-2 overflow-y-auto"
        >
          <SettingsAdminModelsList
            :models="providerModels"
            :is-fetching-models="isFetchingModels"
            :provider="selectedProvider"
          />
        </div>

        <!-- Models List (ollama)-->
        <div
          v-if="selectedProvider && selectedProvider === 'ollama'"
          class="w-full flex flex-col gap-2 p-2 overflow-y-auto"
        >
          <SettingsAdminModelsListOllama
            :models="providerModels"
            :is-fetching-models="isFetchingModels"
            :provider="selectedProvider"
            @fetch-models="
              async (urls) => {
                providerModels = await fetchModels('ollama', urls);
              }
            "
          />
        </div>

        <!-- No Provider Selected -->
        <div
          v-if="!selectedProvider"
          class="flex items-center justify-center w-full"
        >
          <div class="text-(--main-color) text-lg">
            Select a provider to see available models
          </div>
        </div>
      </div>
    </SettingsGroup>
  </div>
</template>
