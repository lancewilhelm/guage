<script setup lang="ts">
const props = defineProps<{
  model?: {
    name: string;
    provider: string;
  };
}>();
const currentModelName = computed(() => {
  return props.model?.name;
});
</script>

<template>
  <div v-if="model" class="flex items-center gap-1">
    <Icon
      :name="getModelProviderIcon(model.provider)"
      class="text-(--main-color) scale-90"
    />
    <div class="text-(--main-color) text-sm">
      {{ currentModelName }}
    </div>
  </div>
</template>
