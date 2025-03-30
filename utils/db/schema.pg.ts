import "dotenv/config";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Create the schema
// USERS TABLE
export const usersTable = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text("name"),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] })
    .default("user")
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const chatsTable = pgTable("chats", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // Persist activeBranch as a JSON array.
  activeBranch: jsonb("active_branch")
    .notNull()
    .default(sql`'[]'`),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  pinned: boolean("pinned"),
  deleted: boolean("deleted"),
});

// CHAT MESSAGES TABLE
export const messagesTable = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chatsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  childrenIds: uuid("children_ids").array(),
  content: text("content").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  deleted: boolean("deleted"),
  model: jsonb("model"),
});

// USER SETTINGS TABLE
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  settings: jsonb("settings")
    .notNull()
    .default(sql`'{}'`),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
});

// GLOBAL SETTINGS TABLE
export const globalSettings = pgTable("global_settings", {
  id: uuid("user_id").primaryKey(),
  settings: jsonb("settings")
    .notNull()
    .default(sql`'{}'`),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
});

// Define the types
export type SelectUser = InferSelectModel<typeof usersTable>;
export type SelectChat = InferSelectModel<typeof chatsTable>;
export type SelectMessage = InferSelectModel<typeof messagesTable>;
export type SelectUserSetting = InferSelectModel<typeof userSettings>;
export type SelectGlobalSetting = InferSelectModel<typeof globalSettings>;

export type InsertUser = InferInsertModel<typeof usersTable>;
export type InsertChat = InferInsertModel<typeof chatsTable>;
export type InsertMessage = InferInsertModel<typeof messagesTable>;
export type InsertUserSetting = InferInsertModel<typeof userSettings>;
export type InsertGlobalSetting = InferInsertModel<typeof globalSettings>;
