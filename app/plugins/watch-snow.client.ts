export default defineNuxtPlugin(() => {
  const userSettings = useUserSettingsStore();
  watch(
    () => userSettings.settings.funboxModes,
    (modes) => {
      if (!modes || !modes.includes("snow")) {
        stopSnow();
        return;
      }
      if (modes.includes("snow")) {
        startSnow();
        return;
      }
    },
    { immediate: true },
  );
});
