<script setup lang="ts">
const globalSettingsStore = useGlobalSettingsStore();
</script>

<template>
  <SettingsGroup title="upload" icon="lucide:file-up">
    <SettingsToggleItem
      title="allow file upload to chat"
      description="the whole text from uploaded files will be appeneded to their respective messages"
      :value="globalSettingsStore.settings.allowFileUpload"
      @toggle="
        () => {
          globalSettingsStore.updateSettings({
            allowFileUpload: !globalSettingsStore.settings.allowFileUpload,
          });
        }
      "
    />
  </SettingsGroup>
</template>
