<script setup lang="ts">
const uiStore = useUiStore();
</script>

<template>
  <div class="flex justify-between py-2 px-4 items-center gap-4">
    <div class="flex gap-4 items-center">
      <Icon
        v-if="!uiStore.chatListVisible"
        name="lucide:panel-left-open"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="uiStore.setChatListVisible(true)"
      />
      <Icon
        v-if="!uiStore.chatListVisible"
        name="lucide:plus"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="navigateTo('/chat')"
      />
    </div>
    <div class="flex gap-4 items-center">
      <Icon
        name="lucide:settings"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="navigateTo('/settings')"
      />
      <Icon
        name="lucide:log-out"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="useSignOut"
      />
    </div>
  </div>
</template>
