<script setup lang="ts">
const chatStore = useChatStore();
const sortedMessages = computed(() => {
  if (!chatStore.currentChatId) return [];
  const messages = chatStore.chats[chatStore.currentChatId]?.messages || [];
  if (!Object.keys(messages).length) return [];
  const sortedMessages = Object.values(messages).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return sortedMessages;
});
</script>
<template>
  <div v-if="chatStore.currentChatId" class="flex flex-col gap-2 w-full">
    <div
      v-for="message in sortedMessages"
      :key="message.id"
      class="flex gap-2 items-center"
    >
      {{ message.content }}
    </div>
  </div>
</template>
