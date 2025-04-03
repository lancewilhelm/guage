<script setup lang="ts">
// Imports
import type { LocalMessage } from "~/utils/db/local";

// Props
const props = defineProps<{
  message: LocalMessage;
  versionInfo?: {
    total: number;
    currentIndex: number;
    versionIds: string[];
  };
}>();

// Definitions
const isButtonRowVisible = ref(false);
const editedContent = ref(props.message.content);
const contentRef = ref<HTMLElement | null>(null);

// Handle copying text to clipboard
const isCopied = ref(false);
function handleCopy() {
  if (!contentRef.value) return;
  navigator.clipboard.writeText(contentRef.value.innerText);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 2000);
}

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
</script>

<template>
  <div
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
          class="w-full p-1 focus:outline-none max-h-[600px] resize-none"
        />
        <div class="flex gap-3 justify-end">
          <Icon
            name="lucide:check"
            class="text-(--yes-color) scale-125 cursor-pointer"
            @click="
              () => {
                isEditing = false;
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
            'flex flex-col gap-2 rounded-lg p-3',
            message.role === 'user' ? 'max-w-full' : 'w-full',
          ]"
        >
          <ChatBubbleContent
            v-if="message.content"
            :content="message.content"
            :role="message.role"
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
          <ChatBubbleVersions
            v-if="versionInfo && versionInfo.total > 1"
            :version-info="versionInfo"
          />
          <Icon
            v-if="isCopied"
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
            @mousedown="handleCopy"
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
