import "dotenv/config";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({ url: "file:data/guage.db" });
export const cloudDb = drizzle(client);
