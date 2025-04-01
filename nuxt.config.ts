import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/icon"],
  runtimeConfig: {
    openaiApiKey: "",
    public: {
      baseUrl: "http://localhost:3000",
    },
  },
  imports: {
    dirs: ["utils"],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
