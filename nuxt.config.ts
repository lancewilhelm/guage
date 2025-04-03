import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css", "~/assets/css/hljs.css"],
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@vueuse/nuxt",
    "@pinia/nuxt",
    "@nuxtjs/mdc",
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
    },
  },
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
  mdc: {
    components: {
      prose: true,
    },
    remarkPlugins: {
      "remark-gfm": {},
      "remark-math": {},
    },
    rehypePlugins: {
      "rehype-katex": {},
      "rehype-highlight": {
        options: {
          detect: true,
        },
      },
    },
  },
  components: ["~/components", { path: "~/components/mdc", pathPrefix: false }],
});
