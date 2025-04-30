<script setup lang="ts">
import type { MessageFile } from "~/utils/db/local";
const { showDeleteButton = true } = defineProps<{
  file: MessageFile;
  showDeleteButton?: boolean;
}>();
const isModalOpen = ref(false);
const emit = defineEmits<{
  (e: "deleteFile"): void;
}>();
</script>
<template>
  <div
    class="flex items-center gap-1 text-(--main-color) px-3 py-1 bg-(--sub-alt-color) rounded-full cursor-pointer"
    @click="isModalOpen = true"
  >
    <Icon name="lucide:file-text" class="scale-125" />
    <div class="font-mono">{{ file.name }}</div>
  </div>

  <!-- popup -->
  <ModalWindow
    :open="isModalOpen"
    :shift-for-chat-list="true"
    @close="isModalOpen = false"
  >
    <div class="flex flex-col gap-2 max-h-[80vh]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="lucide:file-text" class="text-(--main-color) scale-125" />
          <div class="font-bold">{{ file.name }}</div>
        </div>
        <Icon
          name="lucide:x"
          class="text-(--main-color) cursor-pointer"
          @click="isModalOpen = false"
        />
      </div>
      <div class="h-[1px] bg-(--sub-color) header-lines"></div>
      <div class="whitespace-pre-wrap overflow-y-auto overflow-x-hidden">
        {{ file.text }}
      </div>
      <button
        v-if="showDeleteButton"
        class="bg-(--error-color) text-white rounded px-4 py-2"
        @click="
          () => {
            emit('deleteFile');
            isModalOpen = false;
          }
        "
      >
        <Icon name="lucide:trash-2" class="text-(--bg-color) scale-125" />
      </button>
    </div>
  </ModalWindow>
</template>
