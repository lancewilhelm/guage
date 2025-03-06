import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const users = pgTable("users", {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => uuidv4()),
  name: text('name'),
  role: text('role').default('user').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`now()`).notNull(),
});
