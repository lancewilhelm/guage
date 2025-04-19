<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from "vue";

const userSettingsStore = useUserSettingsStore();
const globalSettingsStore = useGlobalSettingsStore();

const currentModel = computed(() => userSettingsStore.settings.model);
const availableModels = computed(
  () => globalSettingsStore.settings.availableModels,
);

const popupVisible = ref(false);
const popupRef = ref<HTMLElement | null>(null);

// Close on escape or outside click
const handleClickOutside = (event: MouseEvent) => {
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    popupVisible.value = false;
  }
};

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    popupVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscapeKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  document.removeEventListener("keydown", handleEscapeKey);
});
</script>

<template>
  <div class="relative chat-input-model">
    <div
      class="flex items-center gap-2 cursor-pointer"
      @mousedown.stop.prevent="popupVisible = !popupVisible"
    >
      <Icon
        v-if="currentModel"
        :name="`simple-icons:${currentModel?.provider}`"
        class="text-(--main-color) scale-125"
      />
      <div class="flex items-center gap-1">
        <div v-if="currentModel" class="text-sm text-(--main-color) font-mono">
          {{ currentModel.name }}
        </div>
        <div
          v-if="!currentModel && availableModels.length"
          class="flex items-center gap-1"
        >
          <Icon name="lucide:triangle-alert" class="text-(--error-color)" />
          <div class="text-(--error-color)">no model selected</div>
        </div>
        <div v-if="!availableModels.length" class="flex items-center gap-1">
          <Icon name="lucide:triangle-alert" class="text-(--error-color)" />
          <div class="text-(--error-color)">no models available</div>
        </div>
        <Icon
          v-if="availableModels.length"
          name="lucide:chevron-up"
          :class="[
            'cursor-pointer hover:opacity-80 transition-transform ',
            currentModel ? 'text-(--main-color)' : 'text-(--error-color)',
            popupVisible ? 'rotate-180' : 'rotate-0 duration-200',
          ]"
        />
      </div>
    </div>
    <!-- popup -->
    <div
      v-if="popupVisible && availableModels.length"
      ref="popupRef"
      class="absolute bottom-full mb-2 left-0 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg w-60 max-h-60 z-10 chat-input-model-popup overflow-y-auto"
    >
      <div v-for="model in availableModels" :key="model.name">
        <div
          :class="[
            'flex items-center gap-2 px-3 py-2 cursor-pointer chat-input-model-item',
            currentModel?.name === model.name &&
            currentModel?.provider === model.provider
              ? 'bg-(--sub-color)/20'
              : 'hover:bg-(--sub-color)/10',
          ]"
          @click="
            () => {
              userSettingsStore.updateSettings({
                model: { name: model.name, provider: model.provider },
              });
              popupVisible = false;
            }
          "
        >
          <Icon
            :name="`simple-icons:${model.provider}`"
            class="text-(--main-color) scale-125"
          />
          <div>{{ model.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
