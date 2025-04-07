<script setup lang="ts">
defineProps<{
  title: string;
  icon: string | Component;
  description?: string;
}>();
</script>
<template>
  <div class="flex flex-col items-start w-full mb-4">
    <div
      class="flex w-full items-center justify-between gap-1 text-(--main-color) text-xl"
    >
      <div
        class="flex gap-1 items-center fill-(--main-color) text-(--main-color) text-lg border-b border-(--sub-color) mb-4 px-2"
      >
        <Icon
          v-if="typeof icon === 'string'"
          :name="icon"
          class="text-(--main-color)"
        />
        <component :is="icon" v-else class="text-(--main-color)" />
        {{ title }}
      </div>
      <div class="justify-self-end text-(--sub-color) text-sm">
        {{ description }}
      </div>
    </div>
    <slot />
  </div>
</template>
