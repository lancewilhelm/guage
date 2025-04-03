<script setup lang="ts">
const chatStore = useChatStore();
const sortedChats = computed(() => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);
  return {
    Pinned: Object.values(chatStore.chats).filter((chat) => chat.pinned),
    Today: Object.values(chatStore.chats).filter(
      (chat) => !chat.pinned && chat.updatedAt >= today,
    ),
    Yesterday: Object.values(chatStore.chats).filter(
      (chat) =>
        !chat.pinned && chat.updatedAt >= yesterday && chat.updatedAt < today,
    ),
    "Last 7 Days": Object.values(chatStore.chats).filter(
      (chat) =>
        !chat.pinned &&
        chat.updatedAt >= lastWeek &&
        chat.updatedAt < yesterday,
    ),
    "Last 30 Days": Object.values(chatStore.chats).filter(
      (chat) =>
        !chat.pinned &&
        chat.updatedAt >= lastMonth &&
        chat.updatedAt < lastWeek,
    ),
    Older: Object.values(chatStore.chats).filter(
      (chat) => !chat.pinned && chat.updatedAt < lastMonth,
    ),
  };
});

const chatListRef = ref<HTMLElement | null>(null);
const resizerRef = ref<HTMLElement | null>(null);

const minWidth = 250;
const maxWidth = 600;
const uiStore = useUiStore();

useDraggable(resizerRef, {
  preventDefault: true,
  onMove: (position) => {
    if (position.x < minWidth / 2) {
      uiStore.setChatListWidth(minWidth);
      uiStore.setChatListVisible(false);
    } else {
      uiStore.setChatListWidth(
        Math.max(minWidth, Math.min(position.x, maxWidth)),
      );
    }
  },
});
</script>

<template>
  <div
    ref="chatListRef"
    class="h-full bg-(--sub-alt-color)"
    :style="{
      display: uiStore.chatListVisible ? 'flex' : 'none',
    }"
  >
    <div
      class="flex flex-col grow w-full"
      :style="{ width: uiStore.chatListWidth + 'px' }"
    >
      <div class="flex w-full h-[40px] items-center px-4">
        <Icon
          name="lucide:panel-left-close"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="uiStore.setChatListVisible(false)"
        />
        <div class="grow text-center">Chats</div>
        <Icon
          name="lucide:plus"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="
            async () => {
              navigateTo('/chat');
            }
          "
        />
      </div>
      <div class="flex flex-col justify-center p-2">
        <div class="flex flex-col w-full items-center gap-2">
          <div class="flex flex-col w-full gap-2">
            <div
              v-for="[groupName, group] of Object.entries(sortedChats)"
              :key="groupName"
              class="flex flex-col w-full gap-2"
            >
              <ChatListGroupTitle v-if="group.length" :title="groupName" />
              <ChatListItem
                v-for="chat of group"
                :key="chat.id"
                :chat="chat"
                @mousedown="
                  async () => {
                    navigateTo('/chat/' + chat.id);
                  }
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      ref="resizerRef"
      class="flex w-[3px] shrink-0 cursor-ew-resize bg-(--bg-color) hover:bg-(--main-color)!"
    />
  </div>
</template>
