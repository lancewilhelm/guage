<script setup lang="ts">
import { provide, ref, onMounted, onBeforeUnmount } from "vue";

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const setIsOpen = (val: boolean) => {
  isOpen.value = val;
};

provide("dropdownContext", {
  isOpen,
  setIsOpen,
  menuRef,
  dropdownRef,
});

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node;
  const clickedOutsideMenu = menuRef.value && !menuRef.value.contains(target);
  const clickedOutsideDropdown =
    dropdownRef.value && !dropdownRef.value.contains(target);
  if (clickedOutsideMenu && clickedOutsideDropdown) {
    isOpen.value = false;
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <div ref="menuRef" class="relative">
    <slot />
  </div>
</template>
