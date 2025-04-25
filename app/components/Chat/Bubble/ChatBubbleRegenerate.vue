<script setup lang="ts">
import type { LocalMessage } from "~/utils/db/local";

const props = defineProps<{
  isButtonRowVisible: boolean;
  message: LocalMessage;
}>();

const userSettingsStore = useUserSettingsStore();
const globalSettingsStore = useGlobalSettingsStore();

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

// Hide the popup when the button row is not visible
watch(
  () => props.isButtonRowVisible,
  (newValue) => {
    if (!newValue) {
      popupVisible.value = false;
    }
  },
);
</script>

<template>
  <div class="relative chat-input-model">
    <div
      class="flex items-center gap-2 cursor-pointer chat-input-model-button"
      @mousedown.stop.prevent="popupVisible = !popupVisible"
    >
      <Icon name="lucide:refresh-cw" />
    </div>
    <!-- popup -->
    <div
      v-if="popupVisible && availableModels.length"
      ref="popupRef"
      class="absolute bottom-full mb-2 left-0 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg w-60 max-h-60 z-10 chat-input-model-popup overflow-y-auto"
    >
      <div
        v-for="model in availableModels.sort((a, b) =>
          a.name.localeCompare(b.name),
        )"
        :key="model.name"
        :class="[
          'grid grid-cols-[20px_1fr] items-center gap-2 px-3 py-2 cursor-pointer chat-input-model-item',
          message.model?.name === model.name &&
          message.model?.provider === model.provider &&
          message.model?.url === model.url
            ? 'bg-(--sub-color)/20'
            : 'hover:bg-(--sub-color)/10',
        ]"
        @click="
          () => {
            userSettingsStore.updateSettings({
              model: {
                name: model.name,
                provider: model.provider,
                url: model.url,
              },
            });
            handleRegenerateMessage(message);
            popupVisible = false;
          }
        "
      >
        <Icon
          :name="getModelProviderIcon(model.provider)"
          class="text-(--main-color) scale-125"
        />
        <div class="flex flex-col overflow-hidden">
          <HoverScrollText>{{ model.name }}</HoverScrollText>
          <div class="text-xs italic text-(--sub-color)">
            {{ model.url }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
