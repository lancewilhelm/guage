<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();
const systemPrompt = computed({
  get: () => userSettingsStore.settings.defaultSystemPrompt,
  set: (value) => {
    userSettingsStore.updateSettings({ defaultSystemPrompt: value });
  },
});
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
          v-model="systemPrompt"
          placeholder="Enter your system prompt here"
          :rows="5"
          class="w-full resize-y rounded-lg bg-(--sub-alt-color) p-2"
        ></textarea>
      </SettingsSubGroup>
    </SettingsGroup>
  </div>
</template>
