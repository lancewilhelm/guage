<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from "vue";

const userSettingsStore = useUserSettingsStore();
const currentPrompt = computed(
  () => userSettingsStore.settings.currentSystemPrompt,
);
const availablePrompts = computed(
  () => userSettingsStore.settings.systemPrompts,
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
  <div
    v-if="Object.keys(availablePrompts).length"
    class="relative chat-input-model"
  >
    <div
      class="flex items-center gap-1 cursor-pointer focus-outline rounded"
      tabindex="0"
      @mousedown.stop.prevent="popupVisible = !popupVisible"
      @keydown.enter="
        () => {
          popupVisible = !popupVisible;
        }
      "
      @keydown.esc.stop.prevent="
        () => {
          popupVisible = false;
        }
      "
      @keydown.space="
        () => {
          popupVisible = !popupVisible;
        }
      "
    >
      <div class="text-sm text-(--main-color)">
        {{ currentPrompt }}
      </div>
      <Icon
        v-if="Object.keys(availablePrompts).length"
        name="lucide:chevron-up"
        :class="[
          'cursor-pointer hover:opacity-80 transition-transform text-(--main-color)',
          popupVisible ? 'rotate-180' : 'rotate-0 duration-200',
        ]"
      />
    </div>
    <!-- popup -->
    <div
      v-if="popupVisible"
      ref="popupRef"
      class="absolute bottom-full mb-2 left-0 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg w-60 max-h-60 z-10 chat-input-model-popup overflow-y-auto"
    >
      <div
        v-for="name in ['default', ...Object.keys(availablePrompts)]"
        :key="name"
      >
        <div
          :class="[
            'flex items-center gap-2 px-3 py-2 cursor-pointer chat-input-model-item',
            currentPrompt === name
              ? 'bg-(--sub-color)/20'
              : 'hover:bg-(--sub-color)/10',
          ]"
          @click="
            () => {
              userSettingsStore.updateSettings({
                currentSystemPrompt: name,
              });
              popupVisible = false;
            }
          "
        >
          <div>{{ name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
