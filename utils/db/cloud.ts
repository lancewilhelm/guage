import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";

export const cloudDb = drizzle("file:./data/guage.db");
