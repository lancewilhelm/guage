<script setup lang="ts">
defineProps<{
  title: string;
  icon: string | Component;
  description?: string;
}>();
</script>
<template>
  <div class="flex flex-col items-start w-full mb-5">
    <div
      class="flex w-full items-center justify-between gap-1 text-(--main-color) text-xl"
    >
      <div class="flex items-center gap-1">
        <Icon
          v-if="typeof icon === 'string'"
          :name="icon"
          class="text-(--main-color)"
        />
        <component
          :is="icon"
          v-else
          class="text-(--main-color) fill-(--main-color)"
        />
        {{ title }}
      </div>
      <div class="justify-self-end text-(--sub-color) text-sm">
        {{ description }}
      </div>
    </div>
    <div class="w-full h-[1px] bg-(--sub-color) my-2" />
    <slot />
  </div>
</template>
