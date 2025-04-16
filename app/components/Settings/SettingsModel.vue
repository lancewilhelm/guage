<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();
const systemPrompt = computed({
  get: () => userSettingsStore.settings.defaultSystemPrompt,
  set: (value) => {
    userSettingsStore.updateSettings({ defaultSystemPrompt: value });
  },
});

// Autorezize the textarea
function resizeTextarea() {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";

    const newHeight = textareaRef.value.scrollHeight + 10;
    textareaRef.value.style.height = `${newHeight}px`;
  }
}

onMounted(() => {
  resizeTextarea();
});

const textareaRef = ref<HTMLTextAreaElement | null>(null);
</script>
<template>
  <div class="w-full">
    <SettingsGroup title="parameters" icon="lucide:braces">
      <SettingsSubGroup
        title="system prompt"
        icon="lucide:letter-text"
        description="saves automatically"
      >
        <textarea
          ref="textareaRef"
          v-model="systemPrompt"
          placeholder="Enter your system prompt here"
          class="w-full resize-y max-h-[500px] rounded-lg bg-(--sub-alt-color) p-2"
          @input="resizeTextarea"
        ></textarea>
      </SettingsSubGroup>
    </SettingsGroup>
  </div>
</template>
