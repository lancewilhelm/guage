import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";

interface Model {
  name: string;
  provider: string;
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
      messagesTable: "&id, chatId, lastUpdated",
      chatsTable: "&id, updatedAt",
    });
  }
}

// Initialize database
export const localDb = new ChatDatabase();

//------------//
//   Types    //
//------------//
export interface LocalMessage {
  id: string;
  chatId: string;
  parentId: string | null;
  childrenIds: string[] | null;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  model?: Model;
  deleted?: boolean;
}

export interface LocalChat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  deleted?: boolean;
  pinned: boolean;
  activeBranch: string[];
}
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
    if (Array.isArray(message)) {
      await localDb.messagesTable.bulkPut(message);
    } else {
      await localDb.messagesTable.put(message);
    }
  } catch (error) {
    console.error("Failed to insert message(s) in local DB:", error);
    throw new Error(
      `Failed to insert message(s): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieve messages from the local database for a given chat.
 * @param chatId The ID of the chat to retrieve messages for.
 * @returns Promise that resolves with an array of messages.
 */
export async function dbRetrieveMessages(chatId: string) {
  return await localDb.messagesTable
    .where("chatId")
    .equals(chatId)
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
  const newChat = {
    id: uuidv4(),
    title,
    createdAt: date,
    updatedAt: date,
    synced: false,
    activeBranch: [],
    pinned: false,
  };
  await localDb.chatsTable.put(newChat);
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
}

/**
 * Retrieve chats from the local database.
 * @returns Promise that resolves with an array of chats.
 */
export async function dbRetrieveChats() {
  return await localDb.chatsTable
    .filter((chat) => !chat.deleted)
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
  return await localDb.chatsTable.get(chatId);
}

/**
 * Mark a chat as deleted in the local database.
 * @param chatId The ID of the chat to mark as deleted.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbMarkChatDeleted(chatId: string) {
  logger.debug("Marking chat as deleted", chatId);
  await localDb.chatsTable.update(chatId, {
    deleted: true,
    synced: false,
    updatedAt: new Date(),
  });
  // Update the deleted flag for all messages in the chat
  await localDb.messagesTable
    .where("chatId")
    .equals(chatId)
    .modify({ deleted: true, synced: false, updatedAt: new Date() });
}

/**
 * Delete all data from the local database.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbNuke() {
  await localDb.messagesTable.clear();
  await localDb.chatsTable.clear();
}

/**
 * Reset the sync status for all chats and messages in the local database.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbResetSyncStatus() {
  await localDb.messagesTable.toCollection().modify({ synced: false });
  await localDb.chatsTable.toCollection().modify({ synced: false });
}
