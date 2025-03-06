import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'), // Needed for credentials auth
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
