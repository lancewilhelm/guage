import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@vueuse/nuxt",
    "@pinia/nuxt",
    "@nuxtjs/mdc",
    "pinia-plugin-persistedstate/nuxt",
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      link: [
        {
          rel: "icon",
          id: "fallback-favicon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
      ],
    },
  },
  css: ["~/assets/css/main.css", "~/assets/css/hljs.css"],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
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
  icon: {
    provider: "server",
    customCollections: [
      {
        prefix: "local",
        dir: "./assets/icons",
      },
    ],
    clientBundle: {
      scan: true,
    },
  },
  fonts: {
    families: [{ name: "Poppins", provider: "google", weight: "bold" }],
  },
  components: [
    { path: "~/components", pathPrefix: false },
    { path: "~/components/mdc", pathPrefix: false },
  ],
});
