import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

//-------------------------//
//          Cloud          //
// Drizzle (Postgres) Init //
//-------------------------//
//
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const cloudDb = drizzle(pool, {
  schema,
});
