import { relations } from "drizzle-orm/relations";
import { users, chats, messages, newMessages } from "./schema";

export const chatsRelations = relations(chats, ({one, many}) => ({
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
	messages: many(messages),
	newMessages: many(newMessages),
}));

export const usersRelations = relations(users, ({many}) => ({
	chats: many(chats),
	messages: many(messages),
	newMessages: many(newMessages),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	message: one(messages, {
		fields: [messages.parentId],
		references: [messages.id],
		relationName: "messages_parentId_messages_id"
	}),
	messages: many(messages, {
		relationName: "messages_parentId_messages_id"
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id]
	}),
}));

export const newMessagesRelations = relations(newMessages, ({one}) => ({
	user: one(users, {
		fields: [newMessages.userId],
		references: [users.id]
	}),
	chat: one(chats, {
		fields: [newMessages.chatId],
		references: [chats.id]
	}),
}));