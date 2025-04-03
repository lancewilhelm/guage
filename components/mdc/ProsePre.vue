<script setup lang="ts">
defineProps<{
  language?: string;
}>();

const preRef = ref<HTMLElement | null>(null);
const isCopied = ref(false);
function copyCode() {
  if (!preRef.value) return;
  const codeElement = preRef.value.querySelector("code");
  if (!codeElement) return;
  navigator.clipboard.writeText(codeElement.innerText);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 2000);
}
</script>
<template>
  <div class="flex flex-col my-[10px] sm:m-[10px] code">
    <div class="flex flex-col">
      <div
        class="grid grid-cols-[min-content_max-content_minmax(0,auto)_min-content] text-sm font-mono"
      >
        <div
          v-if="language"
          class="bg-(--sub-alt-color) text-(--text-color) p-[5px] rounded-tl-(--border-radius) col-start-1 italic rounded-tr-(--border-radius)"
        >
          {{ language }}
        </div>
        <div
          class="flex justify-center w-[30px] items-center bg-(--sub-alt-color) p-[5px] rounded-t-(--border-radius) col-start-4 cursor-pointer hover:opacity-80 transition-all duration-300 copy-code-btn"
          @mousedown="copyCode"
        >
          <Icon
            v-if="isCopied"
            name="lucide:thumbs-up"
            class="text-(--text-color)"
          />
          <Icon
            v-if="!isCopied"
            name="lucide:copy"
            class="text-(--text-color)"
          />
        </div>
      </div>
    </div>
    <pre
      ref="preRef"
      :class="['rounded-b shadow', language ? '' : 'rounded-tl']"
    >
        <slot />
      </pre>
  </div>
</template>
