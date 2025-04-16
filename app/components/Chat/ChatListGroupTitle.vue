<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div
    class="flex w-full items-center justify-center text-center text-sm font-light text-(--text-color) mb-1 chat-list-group-title"
  >
    <span class="w-full h-[1px] bg-(--sub-color) mx-2 header-line" />
    <Icon
      v-if="title === 'Pinned'"
      name="lucide:pin"
      class="text-(--text-color) scale-300 mr-2 chat-list-group-title"
    />
    <div
      class="text flex justify-center text-nowrap text-(--text-color) chat-list-group-title"
    >
      {{ title }}
    </div>
    <span class="w-full h-[1px] bg-(--sub-color) mx-2 header-line" />
  </div>
</template>
