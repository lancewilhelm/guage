<script setup lang="ts">
const isStreaming = ref(false);
const inputValue = ref("");
</script>

<template>
  <div
    class="input-row flex gap-2 p-2 mx-4 border border-(--sub-color) rounded-lg mb-4 backdrop-blur-lg bg-(--bg-color)/60 shadow-md"
  >
    <div class="flex flex-col gap-2 grow items-start">
      <textarea
        v-model="inputValue"
        class="input-box w-full p-1 resize-none focus:outline-none"
        placeholder="Send a message..."
      />
    </div>
    <div class="flex items-center">
      <button
        class="input-button flex flex-shrink-0 items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) cursor-pointer"
        @click="
          () => {
            if (inputValue.trim() === '') return;
            isStreaming = true;
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
