<script setup lang="ts">
import { inject } from "vue";

const context = inject("dropdownContext") as {
  isOpen: Ref<boolean>;
  setIsOpen: (val: boolean) => void;
};

const toggle = () => {
  context.setIsOpen(!context.isOpen.value);
};
</script>

<template>
  <div
    class="flex items-center cursor-pointer drop-down-menu-button"
    @mousedown.prevent.stop="toggle"
  >
    <slot />
  </div>
</template>
