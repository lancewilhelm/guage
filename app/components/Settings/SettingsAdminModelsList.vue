<script setup lang="ts">
import type { Model } from "~/utils/db/local";
defineProps<{
  models: Model[];
  provider: string;
  isFetchingModels: boolean;
}>();

const globalSettingsStore = useGlobalSettingsStore();
const availableModels = computed(() => {
  return globalSettingsStore.settings.availableModels;
});
</script>

<template>
  <div v-if="!models.length" class="flex flex-col gap-1">
    <div
      v-for="model in availableModels.filter((m) => m.provider === provider)"
      :key="model.name"
      class="flex gap-1 items-center"
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
  <div class="flex flex-col gap-1">
    <div v-for="model in models" :key="model.name" class="flex gap-2">
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
  </div>
</template>
