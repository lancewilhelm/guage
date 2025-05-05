<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

const activeKnowledge = computed(
  () => userSettingsStore.settings.activeKnowledge,
);
const { knowledge } = useKnowledgeStore();

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
  <div class="relative chat-input-knowledge">
    <div
      aria-label="Upload file"
      tabindex="0"
      class="flex p-1 rounded-lg cursor-pointer focus-outline"
      :class="
        activeKnowledge === undefined
          ? 'text-(--main-color)'
          : 'bg-(--main-color) text-(--bg-color)'
      "
      @mousedown.stop.prevent="() => (popupVisible = !popupVisible)"
      @keydown.enter="() => (popupVisible = !popupVisible)"
      @keydown.space="() => (popupVisible = !popupVisible)"
    >
      <Icon name="lucide:library" class="cursor-pointer" />
    </div>

    <!-- popup -->
    <div
      v-if="popupVisible"
      ref="popupRef"
      class="absolute bottom-full mb-2 left-0 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg w-60 max-h-60 z-10 chat-input-model-popup overflow-y-auto"
    >
      <div
        v-for="database in knowledge"
        :key="database.id"
        class="grid grid-cols-[min-content_1fr] items-center gap-2 px-3 py-2 chat-input-model-item"
      >
        <div
          class="w-6 h-6 rounded-lg border border-(--sub-color) cursor-pointer"
          :class="
            activeKnowledge === database.id
              ? 'bg-(--main-color)'
              : 'bg-(--bg-color)'
          "
          @click="
            () => {
              if (activeKnowledge === database.id) {
                userSettingsStore.updateSettings({
                  activeKnowledge: undefined,
                });
              } else {
                userSettingsStore.updateSettings({
                  activeKnowledge: database.id,
                });
              }
            }
          "
        />
        <HoverScrollText>{{ database.name }}</HoverScrollText>
      </div>
    </div>
  </div>
</template>
