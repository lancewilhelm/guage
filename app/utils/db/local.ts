import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { triggerDebouncedSync } from "../sync/debounce";
import type OpenAI from "openai";
import type { KnowledgeDocumentResponse } from "../../../server/utils/db/rag";

//------------------------//
//         Types          //
//------------------------//
export interface Model {
  name: string;
  displayName: string;
  provider: string;
  url?: string;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeToFirstToken: number;
  completionTime: number;
  tokensPerSecond: number;
  temperature: number;
  loadDuration?: number;
  promptTokensDetails?: OpenAI.Completions.CompletionUsage.PromptTokensDetails;
  completionTokensDetails?: OpenAI.Completions.CompletionUsage.CompletionTokensDetails;
}

export interface MessageFile {
  name: string;
  type: string;
  size: number;
  text: string;
}

export interface LocalMessage {
  id: string;
  chatId: string;
  userId: string;
  parentId: string | null;
  childrenIds: string[] | null;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  error?: string;
  model?: Model;
  deleted?: boolean;
  usage?: Usage;
  files?: MessageFile[];
  knowledge?: KnowledgeState;
  retrievedKnowledge?: KnowledgeDocumentResponse[];
}

export interface LocalChat {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  pinned: boolean;
  activeBranch: string[];
  deleted?: boolean;
}

//------------------------//
//         Local          //
// Dexie (IndexedDb) Init //
//------------------------//

// Define the local database
class ChatDatabase extends Dexie {
  messagesTable!: EntityTable<LocalMessage, "id">;
  chatsTable!: EntityTable<LocalChat, "id">;

  constructor() {
    super("guage");
    this.version(1).stores({
      messagesTable: "++id, chatId, userId, updatedAt",
      chatsTable: "++id, userId, [id+userId], updatedAt",
    });
  }
}

// Initialize database
export const localDb = new ChatDatabase();

// ----------------------------------------------//
// Functions to interact with the local database //
// ----------------------------------------------//

/**
 * Insert a message or an array of messages into the local database.
 * @param message The message or array of messages to insert.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbCreateMessage(message: LocalMessage | LocalMessage[]) {
  try {
    // Create a serializable version of the message by creating a fresh object
    const prepare = (msg: LocalMessage): LocalMessage => {
      return JSON.parse(JSON.stringify(msg)) as LocalMessage;
    };

    if (Array.isArray(message)) {
      const preparedMessages = message.map(prepare);
      await localDb.messagesTable.bulkPut(preparedMessages);
    } else {
      const preparedMessage = prepare(message);
      await localDb.messagesTable.put(preparedMessage);
    }
  } catch (error) {
    logger.error("Failed to insert message(s) in local DB:", error);
    throw new Error(
      `Failed to insert message(s): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  triggerDebouncedSync();
}

/**
 * Retrieve messages from the local database for a given chat.
 * @param chatId The ID of the chat to retrieve messages for.
 * @returns Promise that resolves with an array of messages.
 */
export async function dbRetrieveMessages(chatId: string) {
  return await localDb.messagesTable
    .where({ chatId })
    .filter((msg) => !msg.deleted)
    .toArray()
    .then((messages) =>
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    );
}

/**
 * Update a message in the local database.
 * @param messageId The ID of the message to update.
 * @param update The properties to update.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbUpdateMessage(
  messageId: string,
  update: Partial<LocalMessage>,
) {
  await localDb.messagesTable.update(messageId, {
    ...update,
    updatedAt: new Date(),
    synced: false,
  });
  triggerDebouncedSync();
}

/**
 * Mark a message as deleted in the local database.
 * @param messageId The ID of the message to mark as deleted.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbMarkMessageDeleted(messageId: string) {
  await localDb.messagesTable.update(messageId, {
    deleted: true,
    synced: false,
    updatedAt: new Date(),
  });
  triggerDebouncedSync();
}

/**
 * Create a chat in the local database.
 * @param title The title of the chat.
 * @returns Promise that resolves with the created chat.
 */
export async function dbCreateChat(
  title: string = "New Chat",
  date: Date = new Date(),
) {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }

  const newChat = {
    id: uuidv4(),
    title,
    userId: user.value.id,
    createdAt: date,
    updatedAt: date,
    synced: false,
    activeBranch: [],
    pinned: false,
  };
  await localDb.chatsTable.put(newChat);
  triggerDebouncedSync();
  return newChat;
}

/**
 * Update a chat in the local database.
 * @param chatId The ID of the chat to update.
 * @param update The properties to update.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbUpdateChat(chatId: string, update: Partial<LocalChat>) {
  await localDb.chatsTable.update(chatId, {
    ...update,
    updatedAt: new Date(),
    synced: false,
  });
  triggerDebouncedSync();
}

/**
 * Retrieve chats from the local database.
 * @returns Promise that resolves with an array of chats.
 */
export async function dbRetrieveChats() {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }

  return await localDb.chatsTable
    .where({ userId: user.value.id })
    .toArray()
    .then((chats) =>
      chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    );
}

/**
 * Retrieve a chat from the local database by ID.
 * @param chatId The ID of the chat to retrieve.
 * @returns Promise that resolves with the chat.
 */
export async function dbRetrieveChat(chatId: string) {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }
  return await localDb.chatsTable.get({ id: chatId, userId: user.value.id });
}

/**
 * Mark a chat as deleted in the local database.
 * @param chatId The ID of the chat to mark as deleted.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbMarkChatDeleted(chatId: string) {
  await localDb.chatsTable.update(chatId, {
    deleted: true,
    synced: false,
    updatedAt: new Date(),
  });
  // Update the deleted flag for all messages in the chat
  await localDb.messagesTable
    .where({ chatId })
    .modify({ deleted: true, synced: false, updatedAt: new Date() });
  triggerDebouncedSync();
}

/**
 * Delete all data from the local database.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbNuke() {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }

  // Delete all messages and chats for the user
  await localDb.messagesTable.where({ userId: user.value.id }).delete();
  await localDb.chatsTable.where({ userId: user.value.id }).delete();
}

/**
 * Reset the sync status for all chats and messages in the local database.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbResetSyncStatus() {
  await localDb.messagesTable.toCollection().modify({ synced: false });
  await localDb.chatsTable.toCollection().modify({ synced: false });
}
