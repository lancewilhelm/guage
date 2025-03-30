import {
  sqliteTable,
  AnySQLiteColumn,
  foreignKey,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const chats = sqliteTable("chats", {
  id: text().primaryKey().notNull(),
  title: text().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activeBranch: text("active_branch").default("[]").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  pinned: integer(),
  deleted: integer(),
});

export const globalSettings = sqliteTable("global_settings", {
  userId: text("user_id").primaryKey().notNull(),
  settings: text().default("{}").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text().primaryKey().notNull(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    childrenIds: text("children_ids"),
    content: text().notNull(),
    role: text().notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "messages_parent_id_messages_id_fk",
    })).onDelete("cascade"),
  ],
);

export const userSettings = sqliteTable(
  "user_settings",
  {
    userId: text("user_id").primaryKey().notNull(),
    settings: text().default("{}").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("user_settings_user_id_unique").on(table.userId)],
);

export const users = sqliteTable(
  "users",
  {
    id: text().primaryKey().notNull(),
    name: text(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text().default("user").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const newMessages = sqliteTable("__new_messages", {
  id: text().primaryKey().notNull(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  childrenIds: text("children_ids"),
  content: text().notNull(),
  role: text().notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deleted: integer(),
  model: text(),
});
