import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Users table for better-auth
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  role: text("role").notNull(),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
});

// Session table for better-auth
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

// Accounts table for better-auth
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Verifications table for better-auth
export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// CHATS TABLE
export const chats = sqliteTable("chats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  title: text("title").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
export const messages = sqliteTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  error: text("error"),
  deleted: integer("deleted", { mode: "boolean" }),
  model: text("model", { mode: "json" }),
  usage: text("usage", { mode: "json" }),
  files: text("files", { mode: "json" }),
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

// TYPE
export type InsertChats = InferInsertModel<typeof chats>;
export type InsertMessages = InferInsertModel<typeof messages>;
export type InsertUserSettings = InferInsertModel<typeof userSettings>;
export type InsertGlobalSettings = InferInsertModel<typeof globalSettings>;

export type SelectChats = InferSelectModel<typeof chats>;
export type SelectMessages = InferSelectModel<typeof messages>;
export type SelectUserSettings = InferSelectModel<typeof userSettings>;
export type SelectGlobalSettings = InferSelectModel<typeof globalSettings>;
