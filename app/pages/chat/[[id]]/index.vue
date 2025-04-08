<script setup lang="ts">
definePageMeta({
  auth: {
    only: "user",
    redirectGuestTo: "/login",
  },
});
// Imports
const route = useRoute();
const chatStore = useChatStore();

// Use composables
const { initialLoad, loadAllChats, loadChat, loadChatMessages } =
  useChatLoader();
const {
  chatContainerRef,
  shouldAutoScroll,
  scrollButtonVisible,
  scrollToBottom,
  updateScrollButtonVisibility,
  initialScrollToBottom,
} = useChatScroll();
const { chatInputRef, focusInput } = useChatInput();

// Page metadata
useHead({
  title: "Chat",
});

// Compute route ID
const routeId = computed(() => {
  if (!route.params.id) return null;
  return Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
});

// Watch for route changes
const router = useRouter();
watch(
  routeId,
  async (newId) => {
    // If the this is the initial load, we need to populate the chat store
    if (initialLoad.value) {
      await loadAllChats();
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
      const success = await loadChat(newId);
      if (!success) {
        router.push("/chat");
        return;
      }
    }

    // Load the chat messages
    await loadChatMessages(newId);

    // Set the current chat ID in the store
    chatStore.setCurrentChatId(newId);

    focusInput();
  },
  { immediate: true },
);

// Scroll to bottom when messages change - respecting auto-scroll preference
watch(
  () =>
    chatStore.currentChatId
      ? chatStore.chats[chatStore.currentChatId]?.messages
      : [],
  () => {
    // Only auto-scroll if enabled or if this is a new message
    if (!chatContainerRef.value) return;

    // Auto-scroll if enabled and it's a new message
    if (shouldAutoScroll.value) {
      nextTick(() => scrollToBottom());
    }

    // Update scroll button visibility after messages are rendered
    nextTick(updateScrollButtonVisibility);
  },
  { deep: true },
);

// Handle initial scroll on mount and whenever chat changes
watch(
  () => chatStore.currentChatId,
  (newChatId) => {
    if (newChatId && chatContainerRef.value) {
      nextTick(() => initialScrollToBottom());
    }
  },
  { immediate: true },
);

const uiStore = useUiStore();
const { width } = useWindowSize();
</script>

<template>
  <div class="w-full h-full grid grid-rows-[40px_1fr] grid-cols-[auto_1fr]">
    <ChatList class="col-start-1 row-span-2" />
    <ChatHeader class="col-start-2" />
    <div
      :class="[
        'flex h-full md:w-full col-start-2 row-start-2 overflow-hidden relative',
        uiStore.chatListVisible ? 'w-screen' : '',
      ]"
      @touchstart="
        () => {
          if (uiStore.chatListVisible && width < 448) {
            uiStore.setChatListVisible(false);
          }
        }
      "
    >
      <div
        ref="chatContainerRef"
        class="flex flex-grow overflow-y-auto overflow-x-hidden chat-container"
      >
        <ChatContainer />
      </div>
      <div
        :class="[
          'absolute left-0 right-0 pt-4 pb-4',
          routeId ? 'bottom-0' : 'bottom-1/2 transform translate-y-1/2',
        ]"
      >
        <div
          v-if="!routeId"
          class="absolute bottom-full left-0 right-0 mb-4 px-6 text-center"
        >
          <div class="text-3xl font-medium text-(--sub-color) mb-2">
            Start a new conversation
          </div>
          <div class="text-sm text-(--sub-color)">
            Type your message below to begin chatting
          </div>
        </div>
        <div class="w-full max-w-(--chat-max-width) mx-auto relative">
          <button
            v-if="scrollButtonVisible"
            class="input-button absolute -top-16 right-6 flex items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) cursor-pointer z-10"
            @mousedown="scrollToBottom()"
          >
            <Icon
              name="lucide:chevron-down"
              class="text-(--bg-color) scale-150"
            />
          </button>
          <ChatInput ref="chatInputRef" />
        </div>
      </div>
    </div>
  </div>
</template>
