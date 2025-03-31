try {
  require("dotenv").config();
} catch {
  // no .env  
}
import { defineConfig } from "drizzle-kit";

const isPostgres = process.env.DATABASE_URL;

export default defineConfig({
  schema: isPostgres
    ? "./utils/db/schema.pg.ts"
    : "./utils/db/schema.sqlite.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: isPostgres
    ? {
      url: process.env.DATABASE_URL!,
    }
    : {
      url: process.env.NODE_ENV === 'production' ? "data/guage.db" : "data/guage.dev.db",
    },
});
