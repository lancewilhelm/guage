<script setup lang="ts">
const props = defineProps<{
  model?: {
    name: string;
    provider: string;
  };
}>();
const openAiIcon = resolveComponent("OpenAiIcon");
const ollamaIcon = resolveComponent("OllamaIcon");
const currentModelIcon = computed(() => {
  switch (props.model?.provider) {
    case "openai":
      return openAiIcon;
    case "ollama":
      return ollamaIcon;
    default:
      return undefined;
  }
});
const currentModelName = computed(() => {
  return props.model?.name;
});
</script>

<template>
  <div v-if="model" class="flex items-center gap-1">
    <component :is="currentModelIcon" class="fill-(--main-color) scale-90" />
    <div class="text-(--main-color) text-sm">
      {{ currentModelName }}
    </div>
  </div>
</template>
