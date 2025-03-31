import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({ url: process.env.NODE_ENV === "production" ? "file:data/guage.db" : "file:data/guage.dev.db" });
export const cloudDb = drizzle(client);
