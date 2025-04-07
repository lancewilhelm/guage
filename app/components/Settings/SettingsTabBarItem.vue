<script setup lang="ts">
defineProps<{
  isActiveTab: boolean;
  path: string;
  icon: string;
  label: string;
}>();
</script>

<template>
  <div
    :class="[
      'flex items-center gap-1 cursor-pointer hover:opacity-80',
      isActiveTab ? 'text-(--main-color) underline' : 'text-(--text-color)',
    ]"
    @click="navigateTo(path)"
  >
    <Icon :name="icon" class="text-(--main-color)" />
    {{ label }}
  </div>
</template>
