<script setup lang="ts">
// Imports
import type { LocalMessage } from "~/utils/db/local";

// Props
const props = defineProps<{
  message?: LocalMessage;
  versionInfo?: {
    total: number;
    currentIndex: number;
    versionIds: string[];
  };
}>();

// Definitions
const isButtonRowVisible = ref(false);
const editedContent = ref(props.message?.content);
const contentRef = ref<HTMLElement | null>(null);

// Focus the textarea when editing
const isEditing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
watch(isEditing, async (val) => {
  if (val) {
    nextTick(() => {
      textareaRef.value?.focus();
    });
  }
});

const { copied, copy } = useClipboard({
  copiedDuring: 2000,
  legacy: true,
});
</script>

<template>
  <div
    v-if="message"
    :class="[
      'chat-bubble flex cursor-default w-full',
      message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
    ]"
    @mouseover="isButtonRowVisible = true"
    @mouseleave="isButtonRowVisible = false"
  >
    <div
      :class="[
        'flex flex-col gap-1 w-full',
        isEditing && 'w-full',
        message.role === 'user' ? 'items-end' : 'items-start',
      ]"
    >
      <div
        v-if="isEditing"
        :class="[
          'flex flex-col w-full gap-2 rounded-lg p-2',
          message.role === 'user' && 'bg-(--sub-alt-color)',
        ]"
      >
        <textarea
          v-if="isEditing"
          ref="textareaRef"
          v-model="editedContent"
          class="w-full p-1 focus:outline-none max-h-[600px] resize-y"
          @keydown.enter="
            (e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              isEditing = false;
              handleEditMessage({ ...message, content: editedContent });
            }
          "
        />
        <div class="flex gap-3 justify-end">
          <Icon
            name="lucide:check"
            class="text-(--yes-color) scale-125 cursor-pointer"
            @click="
              () => {
                isEditing = false;
                handleEditMessage({ ...message, content: editedContent });
              }
            "
          />
          <Icon
            name="lucide:x"
            class="text-(--no-color) scale-125 cursor-pointer"
            @click="isEditing = false"
          />
        </div>
      </div>
      <div
        v-else
        :class="[
          'rounded-lg',
          message.role === 'user'
            ? 'max-w-full bg-(--sub-alt-color)'
            : 'w-full',
        ]"
      >
        <div
          v-if="message.content"
          ref="contentRef"
          :class="[
            'flex flex-col gap-2 rounded-lg',
            message.role === 'user' ? 'max-w-full p-3' : 'w-full',
          ]"
          @dblclick="
            () => {
              if (isEditing || message?.role !== 'user') return;
              isEditing = true;
            }
          "
        >
          <ChatBubbleContent
            v-if="message.content"
            :id="message.id"
            :content="message.content"
            :role="message.role"
            :updated-at="message.updatedAt"
          />
        </div>
        <div v-else class="flex flex-col gap-2 rounded-lg p-3">
          <Icon
            name="svg-spinners:3-dots-bounce"
            class="text-(--main-color) scale-125"
          />
        </div>
      </div>
      <div class="flex">
        <div
          :class="[
            'flex gap-2 items-center',
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
          ]"
        >
          <ChatBubbleResponseInfo :model="message.model" />
          <ChatBubbleVersions
            v-if="versionInfo && versionInfo.total > 1"
            :id="message.id"
            :version-info="versionInfo"
          />
          <Icon
            v-if="copied"
            name="lucide:thumbs-up"
            :class="[
              'cursor-pointer',
              isButtonRowVisible ? 'text-(--main-color)' : 'text-(--bg-color)',
            ]"
          />
          <Icon
            v-else
            name="lucide:copy"
            :class="[
              'cursor-pointer',
              isButtonRowVisible ? 'text-(--main-color)' : 'text-(--bg-color)',
            ]"
            @mousedown="copy(contentRef?.innerText || '')"
          />
          <Icon
            name="lucide:edit"
            :class="[
              'cursor-pointer',
              isButtonRowVisible ? 'text-(--main-color)' : 'text-(--bg-color)',
            ]"
            @click="
              () => {
                isEditing = true;
              }
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-bubble {
  scrollbar-color: var(--main-color) var(--bg-color);
}

.chat-bubble textarea::-webkit-scrollbar-track {
  background: var(--sub-alt-color);
}

.chat-bubble textarea::-webkit-scrollbar-thumb {
  border: 5px solid var(--sub-alt-color);
}
</style>
