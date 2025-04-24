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
  const sortedChats = Object.values(chatStore.chats).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  return {
    Pinned: sortedChats.filter((chat) => chat.pinned),
    Today: sortedChats.filter(
      (chat) => !chat.pinned && chat.updatedAt >= today,
    ),
    Yesterday: sortedChats.filter(
      (chat) =>
        !chat.pinned && chat.updatedAt >= yesterday && chat.updatedAt < today,
    ),
    "Last 7 Days": sortedChats.filter(
      (chat) =>
        !chat.pinned &&
        chat.updatedAt >= lastWeek &&
        chat.updatedAt < yesterday,
    ),
    "Last 30 Days": sortedChats.filter(
      (chat) =>
        !chat.pinned &&
        chat.updatedAt >= lastMonth &&
        chat.updatedAt < lastWeek,
    ),
    Older: sortedChats.filter(
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

const { width } = useWindowSize();
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
      class="flex flex-col grow w-full chat-list"
      :style="{ width: width < 448 ? '100%' : uiStore.chatListWidth + 'px' }"
    >
      <div
        class="flex w-full h-[40px] items-center gap-3 px-4 shrink-0 chat-list-header"
      >
        <Icon
          name="lucide:panel-left-close"
          class="text-(--main-color) cursor-pointer scale-125 header-icon"
          @click="uiStore.setChatListVisible(false)"
        />
        <div class="grow text-center translate-x-2">chats</div>
        <Icon
          name="lucide:search"
          class="text-(--main-color) cursor-pointer scale-125 header-icon"
          @click="
            async () => {
              uiStore.setChatSearchVisible(true);
            }
          "
        />
        <Icon
          name="lucide:plus"
          class="text-(--main-color) cursor-pointer scale-125 header-icon"
          @click="
            async () => {
              navigateTo('/chat');
            }
          "
        />
      </div>
      <div
        class="flex flex-col p-2 overflow-y-auto overflow-x-hidden chat-list-list"
      >
        <div class="flex flex-col w-full items-center gap-2">
          <div class="flex flex-col w-full gap-2">
            <div
              v-for="[groupName, group] of Object.entries(sortedChats).filter(
                ([_, group]) => group.length,
              )"
              :key="groupName"
              class="flex flex-col w-full gap-2"
            >
              <ChatListGroupTitle :title="groupName" />
              <ChatListItem
                v-for="chat of group"
                :key="chat.id"
                :chat="chat"
                @mousedown="
                  async () => {
                    navigateTo('/chat/' + chat.id);
                    if (width < 448) uiStore.setChatListVisible(false);
                  }
                "
              />
            </div>
            <div id="bottom" class="h-[100px]" />
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

<style scoped>
.chat-list ::-webkit-scrollbar-track {
  background: var(--sub-alt-color);
}

.chat-list ::-webkit-scrollbar-thumb {
  border: solid 5px var(--sub-alt-color);
}
</style>
