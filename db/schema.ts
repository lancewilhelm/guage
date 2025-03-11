import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// USERS TABLE (No changes)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
  name: text("name"),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
});

// CHAT SESSIONS TABLE (Stores type of session)
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
  title: text("title").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
  conversationType: text("conversation_type").notNull(), // "chat" or "role-play"
});

// ROLE-PLAY SESSIONS TABLE (Stores special role-play information)
export const rolePlaySessions = pgTable("role_play_sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv4()), // Unique role-play session ID
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  scenario: text("scenario").notNull(), // Custom role-play scenario
  actorName: text("actor_name").notNull(), // Name of the role-play character
  additionalRules: text("additional_rules"), // Any special rules
});

// CHAT MESSAGES TABLE (Supports Branching)
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // Self-referencing for branching
  content: text("content").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  depth: integer("depth").notNull().default(0),
  threadPath: text("thread_path").notNull(), // Precomputed path (e.g., "1/2/4")
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
});
