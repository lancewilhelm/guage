import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./utils/cloud/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "data/guage.db",
  },
});
