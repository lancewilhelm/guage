<script setup lang="ts">
defineProps<{
  language?: string;
  code?: string;
}>();

const { copy, copied } = useClipboard({
  copiedDuring: 2000,
  legacy: true,
});
</script>
<template>
  <div class="flex flex-col my-[10px] sm:m-[10px]">
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
          class="flex justify-center w-[30px] items-center bg-(--sub-alt-color) p-[5px] rounded-t-(--border-radius) col-start-4 cursor-pointer hover:opacity-80 transition-colors duration-300 copy-code-btn"
          @mousedown="copy(code || '')"
        >
          <Icon
            v-if="copied"
            name="lucide:thumbs-up"
            class="text-(--main-color)! bg-current!"
          />
          <Icon
            v-if="!copied"
            name="lucide:copy"
            class="text-(--text-color)! bg-current!"
          />
        </div>
      </div>
    </div>
    <pre :class="['rounded-b shadow', language ? '' : 'rounded-tl']">
      <slot />
    </pre>
  </div>
</template>
