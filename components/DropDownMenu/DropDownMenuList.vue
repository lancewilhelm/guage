<script setup lang="ts">
import { inject, ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import type { Ref } from "vue";

const props = defineProps<{ align?: "left" | "right" }>();
const align = ref(props.align || "left");

const context = inject("dropdownContext") as {
  isOpen: Ref<boolean>;
  menuRef: Ref<HTMLElement | null>;
};
const isOpen = context.isOpen;
const buttonRef = context.menuRef;

const dropdownRef = ref<HTMLElement | null>(null);
const dropdownStyles = ref<Record<string, string>>({});

const updateDropdownPosition = () => {
  const button = buttonRef?.value;
  const dropdown = dropdownRef.value;
  if (!button || !dropdown) return;

  const rect = button.getBoundingClientRect();

  dropdownStyles.value = {
    position: "absolute",
    top: `${rect.bottom + window.scrollY}px`,
    left:
      align.value === "right"
        ? `${rect.right + window.scrollX - dropdown.offsetWidth}px`
        : `${rect.left + window.scrollX}px`,
    minWidth: `${rect.width}px`,
    zIndex: "9999",
  };
};

onMounted(() => {
  watch(isOpen, async (val) => {
    if (val) {
      await nextTick();
      updateDropdownPosition();
    }
  });

  window.addEventListener("scroll", updateDropdownPosition, true);
  window.addEventListener("resize", updateDropdownPosition);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateDropdownPosition, true);
  window.removeEventListener("resize", updateDropdownPosition);
});
</script>

<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      ref="dropdownRef"
      class="bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg mt-2"
      :style="dropdownStyles"
    >
      <slot />
    </div>
  </teleport>
</template>
