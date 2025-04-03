<script setup lang="ts">
// Imports
import {
  dbRetrieveChat,
  dbRetrieveChats,
  dbRetrieveMessages,
} from "~/utils/db/local";
const route = useRoute();
const chatStore = useChatStore();

// Page metadata
useHead({
  title: "Chat",
});

// Load chats and messages on page load and navigation
const routeId = computed(() => {
  if (!route.params.id) return null;
  return Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
});

const initialLoad = ref(true);

watch(
  routeId,
  async (newId) => {
    // If the this is the initial load, we need to populate the chat store
    if (initialLoad.value) {
      // Populate the chat store on initial page load
      const allChats = await dbRetrieveChats();
      if (allChats.length) {
        allChats.forEach((chat) => {
          if (!chat.deleted) {
            chatStore.createChat(
              chat.id,
              chat.title,
              chat.createdAt,
              chat.updatedAt,
              chat.activeBranch,
              chat.pinned,
            );
          }
        });
      }
      initialLoad.value = false;
    }

    // If the chat ID is not provided, set the current chat ID to null
    if (!newId) {
      chatStore.setCurrentChatId();
      focusInput();
      return;
    }

    // Check if the chat is already loaded
    if (newId === chatStore.currentChatId) return;

    // Load the chat data into the store
    if (!initialLoad.value) {
      const chat = await dbRetrieveChat(newId);
      if (!chat) {
        navigateTo("/chat");
        return;
      }
      chatStore.createChat(
        newId,
        chat.title,
        chat.createdAt,
        chat.updatedAt,
        chat.activeBranch,
        chat.pinned,
      );
    }

    // Load the chat messages
    const messages = await dbRetrieveMessages(newId);
    for (const message of messages) {
      chatStore.addMessage(newId, message);
    }

    // Set the current chat ID in the store
    chatStore.setCurrentChatId(newId);

    focusInput();
  },
  { immediate: true },
);

const chatInputRef = ref<HTMLElement | null>(null);
function focusInput() {
  if (chatInputRef.value) {
    nextTick(() => {
      chatInputRef.value?.focus();
    });
  }
}

const isChatListOpen = ref(true);
</script>

<template>
  <div class="w-full h-full grid grid-rows-[40px_1fr] grid-cols-[auto_1fr]">
    <ChatList v-model:is-open="isChatListOpen" class="col-start-1 row-span-2" />
    <ChatHeader
      v-model:is-chat-list-open="isChatListOpen"
      class="col-start-2"
    />
    <div
      class="flex h-full w-full col-start-2 row-start-2 overflow-hidden relative"
    >
      <div
        class="flex flex-grow overflow-y-auto overflow-x-hidden chat-container"
      >
        <ChatContainer />
      </div>
      <div class="absolute bottom-0 left-0 right-0 pt-4 pb-4">
        <div class="w-full max-w-(--chat-max-width) mx-auto">
          <ChatInput ref="chatInputRef" />
        </div>
      </div>
    </div>
  </div>
</template>
