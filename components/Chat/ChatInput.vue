<script setup lang="ts">
const inputValue = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const chatStore = useChatStore();

const isStreaming = computed(() => {
  if (!chatStore.currentChatId) return false;
  return chatStore.chats[chatStore.currentChatId]?.isStreaming;
});

// Set intial height of the textarea
onMounted(() => {
  document.documentElement.style.setProperty(
    "--input-row-height",
    `${textareaRef.value?.scrollHeight}px`,
  );
  nextTick().then(() => {
    if (textareaRef.value) {
      resizeTextarea();
    }
  });
});

// Autorezize the textarea
function resizeTextarea() {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
    const newHeight = Math.min(textareaRef.value.scrollHeight, 300);
    textareaRef.value.style.height = `${newHeight}px`;
    document.documentElement.style.setProperty(
      "--input-row-height",
      `${newHeight}px`,
    );
  }
}

// Expose function to focus the input
defineExpose({
  focus: () => {
    if (textareaRef.value) {
      textareaRef.value.focus();
    }
  },
});
</script>

<template>
  <div
    class="input-row flex gap-2 p-2 mx-4 border border-(--sub-color) rounded-lg mb-4 backdrop-blur-lg bg-(--bg-color)/60 shadow-md"
  >
    <div class="flex flex-col gap-2 grow items-start">
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        class="input-box w-full p-1 resize-none focus:outline-none"
        placeholder="Send a message..."
        @input="resizeTextarea"
        @keydown.enter="
          (e) => {
            if (isStreaming) return;
            if (e.shiftKey) return;
            e.preventDefault();
            if (inputValue.trim() === '') return;
            handleSubmitMessage(inputValue);
            inputValue = '';
            resizeTextarea();
          }
        "
      />
    </div>
    <div class="flex items-center">
      <button
        class="input-button flex flex-shrink-0 items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) cursor-pointer"
        @click="
          () => {
            if (!isStreaming) {
              if (inputValue.trim() === '') return;
              handleSubmitMessage(inputValue);
              inputValue = '';
            } else {
              if (!chatStore.currentChatId) return;
              chatStore.chats[chatStore.currentChatId].abortController?.abort();
            }
            if (inputValue.trim() === '') return;
            handleSubmitMessage(inputValue);
          }
        "
      >
        <Icon
          v-if="isStreaming"
          name="fa6-solid:square"
          class="text-(--bg-color)"
        />
        <Icon
          v-else
          name="lucide:arrow-up"
          class="text-(--bg-color) scale-125"
        />
      </button>
    </div>
  </div>
</template>
