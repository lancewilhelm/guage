export default defineNuxtPlugin(() => {
  const userSettings = useUserSettingsStore(); // SSR-compatible

  const theme = userSettings.settings.theme || "guage_light";

  // Inject the theme stylesheet in SSR response
  useHead({
    link: [
      {
        id: "currentTheme",
        rel: "stylesheet",
        href: `/css/themes/${theme}.css`,
      },
    ],
  });
});
