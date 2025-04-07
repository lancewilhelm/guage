<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div
    class="flex w-full items-center justify-center text-center text-sm font-light text-(--text-color) mb-1"
  >
    <span class="w-full h-[1px] bg-(--sub-color) mx-2" />
    <Icon
      v-if="title === 'Pinned'"
      name="lucide:pin"
      class="text-(--text-color) scale-300 mr-2"
    />
    <div class="flex justify-center text-nowrap text-(--text-color)">
      {{ title }}
    </div>
    <span class="w-full h-[1px] bg-(--sub-color) mx-2" />
  </div>
</template>
