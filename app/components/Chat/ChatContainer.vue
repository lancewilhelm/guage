<script setup lang="ts">
import type { LocalMessage } from "~/utils/db/local";

const chatStore = useChatStore();
const activeMessages = computed(() => {
  if (!chatStore.currentChatId) return [];
  const messages = chatStore.chats[chatStore.currentChatId]?.messages || {};
  const activeBranch = chatStore.chats[chatStore.currentChatId]?.activeBranch;
  if (!Object.keys(messages).length || !activeBranch?.length) return [];
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
  message: LocalMessage | undefined,
): ComputedVersionInfo | undefined {
  if (!message || !chatStore.currentChatId) return undefined;

  const messages = chatStore.chats[chatStore.currentChatId]?.messages;
  if (!messages) return undefined;

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

// Handle scrolling
const { containerRef, scrollToBottom, isNearBottom, vMeasure } =
  useScrollList();

defineExpose({
  scrollToBottom,
  isNearBottom,
});

// uiStore
const uiStore = useUiStore();
const inputPadding = computed(() => uiStore.inputHeight + 110);

watch(inputPadding, () => {
  if (containerRef.value && isNearBottom.value) {
    scrollToBottom();
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="h-full w-full overflow-x-hidden overflow-y-auto"
  >
    <div class="max-w-(--chat-max-width) mx-auto px-6 flex flex-col gap-4">
      <div v-for="message in activeMessages" :key="message?.id" v-measure>
        <ChatBubble
          :message="message"
          :version-info="computeVersionInfo(message)"
        />
      </div>
      <div :style="{ height: inputPadding + 'px' }" />
    </div>
  </div>
</template>
