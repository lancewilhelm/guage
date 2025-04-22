<script setup lang="ts">
const uiStore = useUiStore();
const { signOut } = useAuth();
</script>

<template>
  <div class="flex justify-between items-center gap-4 h-[40px] z-10 app-header">
    <div
      class="flex gap-4 items-center p-4 rounded-br-2xl app-header-left"
      :class="!uiStore.chatListVisible ? 'bg-(--bg-color)' : ''"
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
    <div
      class="flex gap-4 items-center bg-(--bg-color) p-4 rounded-bl-2xl justify-self-end app-header-right"
    >
      <Icon
        name="lucide:command"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="
          uiStore.setCommandPaletteVisible(!uiStore.commandPaletteVisible)
        "
      />
      <Icon
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
