<script setup lang="ts">
defineProps<{
  id: string;
  versionInfo: {
    total: number;
    currentIndex: number;
    versionIds: string[];
  };
}>();

const chatStore = useChatStore();
</script>
<template>
  <div class="flex items-center gap-1">
    <Icon
      name="lucide:chevron-left"
      class="text-(--main-color) scale-125"
      :class="[
        versionInfo.currentIndex === 0 ? 'opacity-50' : 'cursor-pointer',
      ]"
      @mousedown="
        () => {
          if (!chatStore.currentChatId || versionInfo.currentIndex <= 0) return;
          chatStore.changeBranch(
            chatStore.currentChatId,
            id,
            versionInfo.currentIndex - 1,
          );
        }
      "
    />
    <div class="text-[var(--main-color)]">
      {{ versionInfo.currentIndex + 1 }} of {{ versionInfo.total }}
    </div>
    <Icon
      name="lucide:chevron-right"
      class="text-(--main-color) scale-125"
      :class="[
        versionInfo.currentIndex === versionInfo.total - 1
          ? 'opacity-50'
          : 'cursor-pointer',
      ]"
      @mousedown="
        () => {
          if (
            !chatStore.currentChatId ||
            versionInfo.currentIndex >= versionInfo.total - 1
          )
            return;
          chatStore.changeBranch(
            chatStore.currentChatId,
            id,
            versionInfo.currentIndex + 1,
          );
        }
      "
    />
  </div>
</template>
