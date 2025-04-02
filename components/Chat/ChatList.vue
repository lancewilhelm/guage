<script setup lang="ts">
import { dbRetrieveChats } from "~/utils/db/local";

const isOpen = defineModel<boolean>("isOpen");

const chats = (await dbRetrieveChats()).filter((chat) => !chat.deleted);
const chatStore = useChatStore();

const chatListRef = ref<HTMLElement | null>(null);
const resizerRef = ref<HTMLElement | null>(null);

const minWidth = 250;
const maxWidth = 600;
const targetWidth = ref(300);

useDraggable(resizerRef, {
  preventDefault: true,
  onMove: (position) => {
    if (position.x < minWidth / 2) {
      targetWidth.value = minWidth;
      isOpen.value = false;
    } else {
      targetWidth.value = Math.max(minWidth, Math.min(position.x, maxWidth));
    }
  },
});
</script>

<template>
  <div
    ref="chatListRef"
    class="h-full bg-(--sub-alt-color)"
    :style="{
      display: isOpen ? 'flex' : 'none',
    }"
  >
    <div
      class="flex flex-col grow w-full"
      :style="{ width: targetWidth + 'px' }"
    >
      <div class="flex w-full h-[40px] items-center px-4">
        <Icon
          name="lucide:panel-left-close"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="isOpen = false"
        />
        <div class="grow text-center">Chats</div>
        <Icon
          name="lucide:plus"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="
            () => {
              chatStore.setCurrentChatId(undefined);
              navigateTo('/chat');
            }
          "
        />
      </div>
      <div class="flex flex-col justify-center p-2">
        <div class="flex flex-col w-full items-center gap-2">
          <div class="flex flex-col w-full gap-2">
            <div v-for="chat in chats" :key="chat.id" class="flex w-full">
              <ChatListItem
                :chat="chat"
                @click="
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
