<script setup lang="ts">
const inputValue = ref("");
const chatInputRef = ref<HTMLTextAreaElement | null>(null);
const chatStore = useChatStore();

const isStreaming = computed(() => {
  if (!chatStore.currentChatId) return false;
  return chatStore.chats[chatStore.currentChatId]?.isStreaming;
});

const uiStore = useUiStore();

// Set intial height of the textarea
onMounted(() => {
  nextTick().then(() => {
    if (chatInputRef.value) {
      uiStore.setInputHeight(chatInputRef.value.scrollHeight);
      resizeTextarea();
    }
  });
});

// Autorezize the textarea
function resizeTextarea() {
  if (chatInputRef.value) {
    chatInputRef.value.style.height = "auto";
    const newHeight = Math.min(chatInputRef.value.scrollHeight, 300);
    chatInputRef.value.style.height = `${newHeight}px`;
    uiStore.setInputHeight(newHeight);
  }
}

// Expose function to focus the input
defineExpose({
  focus: () => {
    if (chatInputRef.value) {
      chatInputRef.value.focus();
    }
  },
});

const inputButtonRef = ref<HTMLButtonElement | null>(null);
</script>

<template>
  <div
    class="input-row flex gap-2 p-2 mx-4 border border-(--sub-color) rounded-lg mb-4 backdrop-blur-lg bg-(--bg-color)/60 shadow-md chat-input"
  >
    <div class="flex flex-col gap-2 grow items-start chat-input-left">
      <textarea
        ref="chatInputRef"
        v-model="inputValue"
        class="input-box w-full p-1 resize-none focus:outline-none chat-input-textarea"
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
            if (chatInputRef) {
              chatInputRef.focus();
            }
            nextTick().then(() => {
              resizeTextarea();
            });
          }
        "
      />
      <div>
        <ChatInputModel />
      </div>
    </div>
    <div class="flex items-center chat-input-right">
      <button
        ref="inputButtonRef"
        class="input-button flex flex-shrink-0 items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) active:bg-(--sub-alt-color) cursor-pointer chat-input-button"
        @mousedown.prevent="
          () => {
            if (inputButtonRef) {
              inputButtonRef.blur();
            }
            if (chatInputRef) {
              chatInputRef.focus();
            }
          }
        "
        @click="
          () => {
            if (!isStreaming) {
              if (inputValue.trim() === '') return;
              handleSubmitMessage(inputValue);
              inputValue = '';
            } else {
              if (!chatStore.currentChatId) return;
              chatStore.chats[
                chatStore.currentChatId
              ]?.abortController?.abort();
            }
            if (chatInputRef) {
              chatInputRef.focus();
            }
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

<style scoped>
.input-row textarea {
  scrollbar-color: var(--main-color) transparent;
}

.input-row textarea::-webkit-scrollbar-track {
  background: transparent;
}

.input-row textarea::-webkit-scrollbar-thumb {
  border: 5px solid var(--bg-color);
}
</style>
