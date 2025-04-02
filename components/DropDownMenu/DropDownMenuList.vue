<script setup lang="ts">
import { inject, ref } from "vue";
import type { Ref } from "vue";

const props = defineProps<{ align?: "left" | "right" }>();
const align = ref(props.align || "left");

const context = inject("dropdownContext") as {
  isOpen: Ref<boolean>;
};
const isOpen = context.isOpen;
</script>

<template>
  <div
    v-if="isOpen"
    :class="[
      'absolute bg-(--bg-color) mt-2 border border-(--sub-color) rounded-lg min-w-max z-10 shadow-lg',
      align === 'right' ? 'right-0' : 'left-0',
    ]"
  >
    <slot />
  </div>
</template>
