<script setup lang="ts">
import type { LocalMessage } from "~/utils/db/local";

const chatStore = useChatStore();
const activeMessages = computed(() => {
  if (!chatStore.currentChatId) return [];
  const messages = chatStore.chats[chatStore.currentChatId]?.messages || [];
  const activeBranch = chatStore.chats[chatStore.currentChatId]?.activeBranch;
  if (!Object.keys(messages).length || !activeBranch.length) return [];
  return activeBranch.map((messageId) => {
    return messages[messageId];
  });
});

interface ComputedVersionInfo {
  total: number;
  currentIndex: number;
  versionIds: string[];
}

function computeVersionInfo(
  message: LocalMessage,
  messages: Record<string, LocalMessage>,
): ComputedVersionInfo | undefined {
  if (message.parentId === null) {
    const rootMessages = Object.values(messages).filter(
      (msg) => msg.parentId === null,
    );
    const rootIndex = rootMessages.findIndex((msg) => msg.id === message.id);
    return {
      total: rootMessages.length,
      currentIndex: rootIndex,
      versionIds: rootMessages.map((msg) => msg.id),
    };
  } else {
    const parent = messages[message.parentId];
    if (!parent || !parent.childrenIds) return undefined;
    const versions = parent.childrenIds;
    const currentIndex = versions.indexOf(message.id);
    if (currentIndex === -1) return undefined;
    return { total: versions.length, currentIndex, versionIds: versions };
  }
}

// const autoScroll = ref(true);
const scrollContainer = ref<HTMLElement | null>(null);
defineExpose({
  scrollToBottom: () => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  },
});
</script>

<template>
  <div
    v-if="chatStore.currentChatId"
    ref="scrollContainer"
    class="flex flex-col gap-2 w-full max-w-(--chat-max-width) mx-auto px-5"
  >
    <div
      v-for="message in activeMessages"
      :key="message.id"
      class="flex gap-2 items-center"
    >
      <ChatBubble
        :message="message"
        :version-info="
          computeVersionInfo(
            message,
            chatStore.chats[chatStore.currentChatId].messages,
          )
        "
      />
    </div>
    <div className="h-[calc(var(--input-row-height)+90px)] shrink-0" />
  </div>
</template>
