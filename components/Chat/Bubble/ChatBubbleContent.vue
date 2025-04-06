<script setup lang="ts">
defineProps<{
  content: string;
  role: "user" | "assistant";
}>();
</script>

<template>
  <MDC v-if="role === 'assistant'" :key="content" :value="content" />
  <div v-else class="whitespace-pre-wrap">{{ content }}</div>
</template>
