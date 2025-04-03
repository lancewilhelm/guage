<script setup lang="ts">
import { dbMarkChatDeleted, dbUpdateChat } from "~/utils/db/local";
const props = defineProps<{
  chat: ChatState;
}>();

const newTitle = ref(props.chat.title);

const isRenaming = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const chatStore = useChatStore();
</script>

<template>
  <div
    :class="[
      'w-full flex gap-1.5 justify-between items-center rounded-lg p-1.5 cursor-pointer',
      `${chatStore.currentChatId === chat.id && 'bg-(--bg-color)'}`,
    ]"
    @dblclick="
      () => {
        isRenaming = true;
        nextTick(() => {
          inputRef?.focus();
        });
      }
    "
  >
    <div class="flex cursor-pointer hover:opacity-80 overflow-hidden">
      <input
        v-if="isRenaming"
        ref="inputRef"
        v-model="newTitle"
        type="text"
        class="grow border border-(--sub-color) p-1 rounded w-full"
        @keydown.escape="
          () => {
            isRenaming = false;
            newTitle = chat.title;
          }
        "
        @keydown.enter="
          () => {
            chatStore.updateChatMetadata(chat.id, {
              title: newTitle,
            });
            dbUpdateChat(chat.id, { title: newTitle });
            isRenaming = false;
          }
        "
      />
      <div v-else class="flex gap-1.5 items-center truncate">
        <div class="w-full truncate">
          {{ newTitle }}
        </div>
        <Icon
          v-if="chat.isStreaming"
          name="svg-spinners:6-dots-scale"
          class="text-(--main-color) scale-125"
        />
      </div>
    </div>
    <div v-if="isRenaming" class="flex gap-1.5 items-center">
      <button class="flex items-center cursor-pointer">
        <Icon
          name="lucide:check"
          class="text-(--yes-color) scale-125"
          @click="
            () => {
              chatStore.updateChatMetadata(chat.id, {
                title: newTitle,
              });
              dbUpdateChat(chat.id, { title: newTitle });
              isRenaming = false;
            }
          "
        />
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
          @click="
            () => {
              const newPinned = !chat.pinned;
              chatStore.updateChatMetadata(chat.id, {
                pinned: newPinned,
              });
              dbUpdateChat(chat.id, { pinned: newPinned });
            }
          "
        >
          <Icon
            v-if="chat.pinned"
            name="lucide:pin-off"
            class="text-(--main-color) scale-125"
          />
          <Icon
            v-else
            name="lucide:pin"
            class="text-(--main-color) scale-125"
          />
          {{ chat.pinned ? "Unpin" : "Pin" }}
        </DropDownMenuItem>
        <DropDownMenuItem
          class="flex gap-1.5 items-center"
          @click="
            () => {
              isRenaming = true;
              nextTick(() => {
                inputRef?.focus();
              });
            }
          "
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
