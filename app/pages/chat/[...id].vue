<script setup lang="ts">
import ChatContainer from "~/components/Chat/ChatContainer.vue";
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
const userSettingsStore = useUserSettingsStore();
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
      userSettingsStore.updateSettings({
        currentSystemPrompt: "default",
      });
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

const uiStore = useUiStore();
const { width } = useWindowSize();
const chatContainerRef = ref<InstanceType<typeof ChatContainer> | null>(null);
const chatContainerScrollRef = ref<HTMLDivElement | null>(null);
</script>

<template>
  <div class="w-full h-full grid grid-cols-[auto_1fr] overflow-hidden">
    <ChatList class="col-start-1 h-full overflow-hidden" />
    <div
      v-if="(!uiStore.chatListVisible && width < 448) || width >= 448"
      class="flex h-full w-full col-start-2 overflow-hidden relative"
    >
      <ChatHeader class="absolute top-0 w-full" />
      <div ref="chatContainerScrollRef" class="flex flex-grow overflow-hidden">
        <ChatContainer ref="chatContainerRef" />
      </div>
      <div
        :class="[
          'absolute left-0 right-0 pt-4 chat-input-row pointer-events-none',
          routeId ? 'bottom-0' : 'bottom-1/2 transform translate-y-1/2',
        ]"
      >
        <div
          v-if="!routeId"
          class="absolute bottom-full left-0 right-0 mb-4 px-6 text-center chat-welcome"
        >
          <div class="text-3xl font-medium text-(--sub-color) mb-2">
            Start a new conversation
          </div>
          <div class="text-sm text-(--sub-color)">
            Type your message below to begin chatting
          </div>
        </div>
        <div
          class="w-full max-w-(--chat-max-width) mx-auto relative chat-input-container"
        >
          <button
            v-if="!chatContainerRef?.isNearBottom"
            class="input-button absolute -top-16 right-6 flex items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) cursor-pointer z-10 stb-button pointer-events-auto"
            @mousedown="chatContainerRef?.scrollToBottom()"
            @keydown.enter="
              () => {
                chatContainerRef?.scrollToBottom();
                chatInputRef?.focus();
              }
            "
            @keydown.space="
              () => {
                chatContainerRef?.scrollToBottom();
                chatInputRef?.focus();
              }
            "
          >
            <Icon
              name="lucide:chevron-down"
              class="text-(--bg-color) scale-150"
            />
          </button>
          <ChatInput
            ref="chatInputRef"
            class="pointer-events-auto"
            @chat-container-focus="chatContainerRef?.focus()"
          />
        </div>
      </div>
    </div>
  </div>
</template>
