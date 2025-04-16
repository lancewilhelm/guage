<script setup lang="ts">
const uiStore = useUiStore();
const { signOut } = useAuth();
const route = useRoute();
const chatStore = useChatStore();
</script>

<template>
  <div class="flex justify-between py-2 px-4 items-center gap-4 app-header">
    <div class="flex gap-4 items-center app-header-left">
      <div
        v-if="route.path.startsWith('/chat') && !uiStore.chatListVisible"
        class="flex gap-4 items-center"
      >
        <Icon
          v-if="!uiStore.chatListVisible"
          name="lucide:panel-left-open"
          class="text-(--main-color) cursor-pointer scale-125 header-icon"
          @mousedown="uiStore.setChatListVisible(true)"
          @touch="uiStore.setChatListVisible(true)"
        />
        <Icon
          v-if="!uiStore.chatListVisible"
          name="lucide:plus"
          class="text-(--main-color) cursor-pointer scale-125 header-icon"
          @mousedown="navigateTo('/chat')"
        />
      </div>
      <Icon
        v-if="route.path.startsWith('/settings')"
        name="lucide:bot-message-square"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="
          () => {
            if (chatStore.currentChatId) {
              navigateTo(`/chat/${chatStore.currentChatId}`);
            } else {
              navigateTo('/chat');
            }
          }
        "
      />
    </div>
    <div class="flex gap-4 items-center app-header-right">
      <Icon
        v-if="route.path.startsWith('/chat')"
        name="lucide:settings"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @mousedown="navigateTo('/settings')"
      />
      <Icon
        name="lucide:log-out"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="signOut"
      />
    </div>
  </div>
</template>
