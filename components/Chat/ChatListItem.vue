<script setup lang="ts">
import { dbMarkChatDeleted, type LocalChat } from "~/utils/db/local";
const props = defineProps<{
  chat: LocalChat;
}>();
const newTitle = ref(props.chat.title);

const isRenaming = ref(false);

const chatStore = useChatStore();
</script>

<template>
  <div
    :class="[
      'w-full flex gap-1.5 justify-between items-center rounded-lg p-1.5 cursor-pointer',
      `${chatStore.currentChatId === chat.id && 'bg-(--bg-color)'}`,
    ]"
  >
    <div class="flex cursor-pointer hover:opacity-80 overflow-hidden">
      <input
        v-if="isRenaming"
        v-model="newTitle"
        type="text"
        class="grow border border-(--sub-color) p-1 rounded w-full"
      />
      <div v-else class="flex gap-1.5 items-center truncate">
        <div class="w-full truncate">
          {{ newTitle }}
        </div>
        <Icon
          v-if="false"
          name="svg-spinners:6-dots-scale"
          class="text-(--main-color) scale-125"
        />
      </div>
    </div>
    <div v-if="isRenaming" class="flex gap-1.5 items-center">
      <button class="flex items-center cursor-pointer">
        <Icon name="lucide:check" class="text-(--yes-color) scale-125" />
      </button>
      <button class="flex items-center cursor-pointer">
        <Icon
          name="lucide:x"
          class="text-(--no-color) scale-125 cursor-pointer"
          @click="
            () => {
              newTitle = chat.title;
              isRenaming = false;
            }
          "
        />
      </button>
    </div>
    <DropDownMenu v-else>
      <DropDownMenuButton>
        <Icon
          name="lucide:more-horizontal"
          class="text-(--main-color) scale-125"
        />
      </DropDownMenuButton>
      <DropDownMenuList>
        <DropDownMenuItem
          class="flex gap-1.5 items-center"
          @click="isRenaming = true"
        >
          <Icon name="lucide:edit" class="text-(--main-color) scale-125" />
          Rename
        </DropDownMenuItem>
        <DropDownMenuItem
          class="flex gap-1.5 items-center text-(--error-color)"
          @click="
            () => {
              chatStore.deleteChat(chat.id);
              dbMarkChatDeleted(chat.id);
              if (chatStore.currentChatId === chat.id) {
                chatStore.setCurrentChatId(undefined);
                navigateTo('/chat');
              }
            }
          "
        >
          <Icon name="lucide:trash" class="text-(--error-color) scale-125" />
          Trash
        </DropDownMenuItem>
      </DropDownMenuList>
    </DropDownMenu>
  </div>
</template>
