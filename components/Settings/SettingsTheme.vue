<script setup lang="ts">
import themesList from "~/assets/json/themes.json";

interface Theme {
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
}

const nonFavoriteThemes = computed(() =>
  JSON.parse(JSON.stringify(themesList))
    .filter((theme: Theme) => {
      if (!userSettingsStore.settings.favoriteThemes) return true;
      return !userSettingsStore.settings.favoriteThemes.includes(theme.name);
    })
    .sort(
      (a: Theme, b: Theme) =>
        hexToLuminance(a.bgColor) - hexToLuminance(b.bgColor),
    ),
);

const favoriteThemes = computed(() =>
  JSON.parse(JSON.stringify(themesList))
    .filter((theme: Theme) => {
      if (!userSettingsStore.settings.favoriteThemes) return false;
      return userSettingsStore.settings.favoriteThemes.includes(theme.name);
    })
    .sort(
      (a: Theme, b: Theme) =>
        hexToLuminance(a.bgColor) - hexToLuminance(b.bgColor),
    ),
);

function hexToLuminance(hex: string) {
  hex = hex.replace(/#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const userSettingsStore = useUserSettingsStore();
</script>
<template>
  <div class="w-full">
    <SettingsGroup
      v-if="favoriteThemes.length"
      title="favorite themes"
      icon="lucide:palette"
    >
      <div class="grid grid-cols-3 gap-2 w-full">
        <SettingsThemeItem
          v-for="theme in favoriteThemes"
          :key="theme.name"
          :theme="theme"
          :is-favorite="true"
          @click="
            () => {
              userSettingsStore.updateSettings({ theme: theme.name });
              loadTheme(theme.name);
            }
          "
        />
      </div>
    </SettingsGroup>
    <SettingsGroup title="themes" icon="lucide:palette">
      <div class="grid grid-cols-3 gap-2 w-full">
        <SettingsThemeItem
          v-for="theme in nonFavoriteThemes"
          :key="theme.name"
          :theme="theme"
          :is-favorite="false"
          @click="
            () => {
              userSettingsStore.updateSettings({ theme: theme.name });
              loadTheme(theme.name);
            }
          "
        />
      </div>
    </SettingsGroup>
  </div>
</template>
