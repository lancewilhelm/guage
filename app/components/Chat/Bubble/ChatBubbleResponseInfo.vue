<script setup lang="ts">
import type { Model } from "~/utils/db/local";

defineProps<{
  model?: Model;
}>();
</script>

<template>
  <div v-if="model" class="flex items-center gap-1">
    <Icon
      :name="getModelProviderIcon(model.provider)"
      class="text-(--main-color) scale-90"
    />
    <div class="text-(--main-color) text-sm">
      {{ model.displayName }}
    </div>
  </div>
</template>
