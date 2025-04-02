<script setup lang="ts">
useHead({
  title: "Chat",
});

const isChatListOpen = ref(true);
</script>

<template>
  <div class="w-full h-full grid grid-rows-[40px_1fr] grid-cols-[auto_1fr]">
    <ChatList
      class="col-start-1 row-span-2"
      :is-open="isChatListOpen"
      @close="isChatListOpen = false"
    />
    <ChatHeader
      class="col-start-2"
      :is-chat-list-open="isChatListOpen"
      @open-chat-list="isChatListOpen = true"
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
          <ChatInput class="" />
        </div>
      </div>
    </div>
  </div>
</template>
