import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./utils/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "data/guage.db",
  },
});
