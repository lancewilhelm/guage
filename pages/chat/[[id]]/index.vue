<script setup lang="ts">
import { dbRetrieveChat, dbRetrieveMessages } from "~/utils/db/local";

useHead({
  title: "Chat",
});

const route = useRoute();
const chatStore = useChatStore();
watchEffect(async () => {
  if (route.params.id) {
    const id = Array.isArray(route.params.id)
      ? route.params.id[0]
      : route.params.id;

    if (id === chatStore.currentChatId) return;

    // Load the chat data into the store
    const chat = await dbRetrieveChat(id);
    if (!chat) {
      navigateTo("/chat");
      return;
    }
    chatStore.createChat(
      id,
      chat.title,
      chat.createdAt,
      chat.updatedAt,
      chat.activeBranch,
      chat.pinned,
    );

    // Load the chat messages
    const messages = await dbRetrieveMessages(id);
    for (const message of messages) {
      chatStore.addMessage(id, message);
    }

    // Set the current chat ID in the store
    chatStore.setCurrentChatId(id);
  }
});

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
        <ChatContainer class="mx-auto w-full max-w-(--chat-max-width) px-5" />
      </div>
      <div class="absolute bottom-0 left-0 right-0 pt-4 pb-4">
        <div class="w-full max-w-(--chat-max-width) mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  </div>
</template>
