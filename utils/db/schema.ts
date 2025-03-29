import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// USERS TABLE
export const usersTable = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// CHATS TABLE
export const chatsTable = sqliteTable("chats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  title: text("title").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  activeBranch: text("active_branch", { mode: "json" }).notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  pinned: integer("pinned", { mode: "boolean" }),
  deleted: integer("deleted", { mode: "boolean" }),
});

// MESSAGES TABLE
export const messagesTable = sqliteTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  chatId: text("chat_id")
    .notNull()
    .references(() => chatsTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  childrenIds: text("children_ids", { mode: "json" }), // JSON array
  content: text("content").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  deleted: integer("deleted", { mode: "boolean" }),
});

// USER SETTINGS TABLE
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().unique(),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// GLOBAL SETTINGS TABLE
export const globalSettings = sqliteTable("global_settings", {
  id: text("user_id").primaryKey(),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// SELECT + INSERT TYPES
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
