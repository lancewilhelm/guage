<script setup lang="ts">
const uiStore = useUiStore();
const route = useRoute();
</script>

<template>
  <div class="flex justify-between items-center h-[40px] z-10 app-header">
    <div
      class="flex items-center backdrop-blur bg-(--bg-color)/50 gap-4 p-4 rounded-br-2xl app-header-left z-20"
    >
      <div
        v-if="route.path.startsWith('/chat')"
        class="gap-4 items-center"
        :class="!uiStore.chatListVisible ? 'flex' : 'hidden'"
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
      <PageNavigation />
    </div>
    <div
      class="flex gap-4 items-center backdrop-blur bg-(--bg-color)/50 p-4 rounded-bl-2xl justify-self-end app-header-right z-10"
    >
      <Icon
        name="lucide:command"
        class="text-(--main-color) cursor-pointer scale-125 header-icon"
        @click="
          uiStore.setCommandPaletteVisible(!uiStore.commandPaletteVisible)
        "
      />
    </div>
  </div>
</template>
