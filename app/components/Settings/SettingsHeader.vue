<script setup lang="ts">
const uiStore = useUiStore();
const { signOut } = useAuth();
const chatStore = useChatStore();
</script>

<template>
  <div class="flex justify-between py-2 px-4 items-center gap-4 app-header">
    <div class="flex gap-4 items-center app-header-left">
      <Icon
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
        name="lucide:command"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="
          uiStore.setCommandPaletteVisible(!uiStore.commandPaletteVisible)
        "
      />
      <Icon
        name="lucide:log-out"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="signOut"
      />
    </div>
  </div>
</template>
