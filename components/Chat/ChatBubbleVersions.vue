<script setup lang="ts">
defineProps<{
  versionInfo: {
    total: number;
    currentIndex: number;
    versionIds: string[];
  };
}>();
</script>
<template>
  <div class="flex items-center gap-1">
    <Icon
      name="lucide:chevron-left"
      class="text-(--main-color) scale-125 cursor-pointer"
      :class="[
        'cursor-pointer',
        versionInfo.currentIndex === 0 && 'opacity-50',
      ]"
    />
    <div class="text-[var(--main-color)]">
      {{ versionInfo.currentIndex + 1 }} of {{ versionInfo.total }}
    </div>
    <Icon
      name="lucide:chevron-right"
      class="text-(--main-color) scale-125 cursor-pointer"
      :class="[
        'cursor-pointer',
        versionInfo.currentIndex === versionInfo.total - 1 && 'opacity-50',
      ]"
    />
  </div>
</template>
