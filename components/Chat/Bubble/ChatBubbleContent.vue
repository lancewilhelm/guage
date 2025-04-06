<script setup lang="ts">
defineProps<{
  id: string;
  content: string;
  role: "user" | "assistant";
  updatedAt: Date;
}>();
</script>

<template>
  <MDC
    v-if="role === 'assistant'"
    :key="id + updatedAt.getTime().toString()"
    :value="content"
  />
  <div v-else class="whitespace-pre-wrap">{{ content }}</div>
</template>
