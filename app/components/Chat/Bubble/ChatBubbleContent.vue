<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  id: string;
  content: string;
  role: "user" | "assistant";
  updatedAt: Date;
}>();

// Parse content for <think> block
const parsed = computed(() => {
  if (props.role !== "assistant") {
    return { thinking: null, body: props.content };
  }
  return parseThinkingContent(props.content);
});

const isThinking = computed(() => {
  return (
    props.role === "assistant" &&
    props.content.startsWith("<think>") &&
    !props.content.includes("</think>")
  );
});

function parseThinkingContent(content: string) {
  const openTag = "<think>";
  const closeTag = "</think>";

  const openIndex = content.indexOf(openTag);
  const closeIndex = content.indexOf(closeTag);

  // If there's no <think> tag at all
  if (openIndex !== 0) {
    return { thinking: null, body: content };
  }

  // If we have a closing tag
  if (closeIndex !== -1) {
    return {
      thinking: content.slice(openIndex + openTag.length, closeIndex).trim(),
      body: content.slice(closeIndex + closeTag.length).trim(),
    };
  }

  // No closing tag yet — stream is ongoing
  return {
    thinking: content.slice(openTag.length).trim(),
    body: "",
  };
}

const showThinking = ref(false);
const userSettingsStore = useUserSettingsStore();
</script>

<template>
  <div>
    <!-- Thinking dropdown if present -->
    <div v-if="parsed.thinking" class="mb-4 rounded-lg">
      <div class="flex">
        <button
          class="flex items-center gap-2 p-2 cursor-pointer bg-(--sub-alt-color) rounded-lg shadow-md"
          @click="showThinking = !showThinking"
        >
          <Icon name="lucide:brain" class="text-(--main-color) scale-125" />
          {{ isThinking ? "thinking" : "thoughts" }}
          <Icon
            v-if="isThinking"
            name="svg-spinners:3-dots-bounce"
            class="text-(--main-color) scale-125"
          />
          <Icon
            name="lucide:chevron-down"
            class="text-(--main-color) scale-125 transition-transform"
            :style="{ transform: showThinking ? 'rotate(180deg)' : '' }"
          />
        </button>
      </div>
      <div
        v-if="showThinking"
        class="rounded-lg p-3 mt-1 whitespace-pre-wrap shadow-md bg-(--sub-alt-color) mb-4"
      >
        <MDC
          v-if="parsed.thinking"
          :key="id + updatedAt.getTime().toString() + 'thoughts'"
          :value="parsed.thinking"
          class="flex flex-col gap-4"
        />
      </div>
    </div>

    <!-- Assistant message -->
    <Suspense
      v-if="
        role === 'assistant' &&
        userSettingsStore.settings.messageDisplayMode === 'markdown'
      "
    >
      <template #default>
        <MDC
          v-if="role === 'assistant'"
          :key="id + updatedAt.getTime().toString()"
          :value="parsed.body"
          class="flex flex-col gap-4"
        />
      </template>
      <template #fallback>
        <div class="whitespace-pre-wrap">{{ content }}</div>
      </template>
    </Suspense>

    <!-- User message and Assistant raw mode -->
    <div
      v-else
      :class="[
        'whitespace-pre-wrap',
        userSettingsStore.settings.messageDisplayMode === 'monospace'
          ? 'font-mono'
          : '',
      ]"
    >
      {{ content }}
    </div>
  </div>
</template>
