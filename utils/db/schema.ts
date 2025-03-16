import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Create the schema
// USERS TABLE (No changes)
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
  createdAt: timestamp("created_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
});

// CHAT SESSIONS TABLE (Stores type of session)
export const chatSessionsTable = pgTable("chat_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
  conversationType: text("conversation_type").notNull(), // "chat" or "role-play"
});

// ROLE-PLAY SESSIONS TABLE (Stores special role-play information)
export const rolePlaySessionsTable = pgTable("role_play_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()), // Unique role-play session ID
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessionsTable.id, { onDelete: "cascade" }),
  scenario: text("scenario").notNull(), // Custom role-play scenario
  actorName: text("actor_name").notNull(), // Name of the role-play character
  additionalRules: text("additional_rules"), // Any special rules
});

// CHAT MESSAGES TABLE (Supports Branching)
export const messagesTable = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessionsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => messagesTable.id, {
    onDelete: "cascade",
  }), // Self-referencing for branching
  childrenIds: uuid("children_ids").array(),
  content: text("content").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  depth: integer("depth").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" })
    .default(sql`now()`)
    .notNull(),
});

// Define the types
export type SelectUser = InferSelectModel<typeof usersTable>;
export type SelectChatSession = InferSelectModel<typeof chatSessionsTable>;
export type SelectRolePlaySession = InferSelectModel<
  typeof rolePlaySessionsTable
>;
export type SelectMessage = InferSelectModel<typeof messagesTable>;

export type InsertUser = InferInsertModel<typeof usersTable>;
export type InsertChatSession = InferInsertModel<typeof chatSessionsTable>;
export type InsertRolePlaySession = InferInsertModel<
  typeof rolePlaySessionsTable
>;
export type InsertMessage = InferInsertModel<typeof messagesTable>;
