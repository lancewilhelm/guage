<script setup lang="ts">
// Refs
const isHovered = ref(false);

// Props
defineProps<{
  theme: {
    name: string;
    bgColor: string;
    mainColor: string;
    subColor: string;
    textColor: string;
  };
  isFavorite: boolean;
}>();

const userSettingsStore = useUserSettingsStore();
</script>
<template>
  <div
    :class="[
      'flex w-full justify-between items-center cursor-pointer rounded-full border font-mono px-2 py-0.5',
    ]"
    :style="{
      backgroundColor: theme.bgColor,
      borderColor:
        isHovered || userSettingsStore.settings.theme === theme.name
          ? theme.mainColor
          : 'var(--bg-color)',
      color: theme.textColor,
    }"
    @mouseover="isHovered = true"
    @mouseleave="isHovered = false"
  >
    {{ theme.name }}
    <div class="flex gap-1 shrink-0">
      <Icon
        v-if="!isFavorite && isHovered"
        name="fa6-regular:star"
        class="cursor-pointer"
        :style="{ text: theme.textColor }"
        @click.stop="
          userSettingsStore.updateSettings({
            favoriteThemes: [
              ...(userSettingsStore.settings.favoriteThemes || []),
              theme.name,
            ],
          })
        "
      />
      <Icon
        v-if="isFavorite && isHovered"
        name="fa6-solid:star"
        class="cursor-pointer"
        :style="{ text: theme.textColor }"
        @click.stop="
          userSettingsStore.updateSettings({
            favoriteThemes: userSettingsStore.settings.favoriteThemes.filter(
              (t: string) => t !== theme.name,
            ),
          })
        "
      />
      <div
        class="w-4 h-4 rounded-full"
        :style="{ backgroundColor: theme.mainColor }"
      />
      <div
        class="w-4 h-4 rounded-full"
        :style="{ backgroundColor: theme.subColor }"
      />
      <div
        class="w-4 h-4 rounded-full"
        :style="{ backgroundColor: theme.textColor }"
      />
    </div>
  </div>
</template>
