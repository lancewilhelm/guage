<script setup lang="ts">
defineProps<{
  isActiveTab: boolean;
  path: string;
  icon: string;
  label: string;
}>();
</script>

<template>
  <NuxtLink
    :to="path"
    :class="[
      'flex items-center gap-1 cursor-pointer hover:opacity-80',
      isActiveTab ? 'text-(--main-color) underline' : 'text-(--text-color)',
    ]"
  >
    <Icon :name="icon" class="text-(--main-color)" />
    {{ label }}
  </NuxtLink>
</template>
