import { logger } from "@/utils/logger";
import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { debounce } from "../debounce";

//------------------------//
//         Local          //
// Dexie (IndexedDb) Init //
//------------------------//

// Define local message type
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

// ----------------------------------------------//
// Functions to interact with the local database //
// ----------------------------------------------//

/**
 * Insert a message or an array of messages into the local database.
 * @param message The message or array of messages to insert.
 * @returns Promise that resolves when the operation is complete.
 */
export async function dbCreateMessage(
  message: LocalMessage | LocalMessage[],
): Promise<void> {
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
  cloudDebounedSync();
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
  cloudDebounedSync();
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
  cloudDebounedSync();
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
  cloudDebounedSync();
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
  cloudDebounedSync();
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
    .where("chatId")
    .equals(chatId)
    .modify({ deleted: true, synced: false, updatedAt: new Date() });
  cloudDebounedSync();
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

//----------------//
//  Local & Cloud //
// Sync Functions //
//----------------//

/**
 * Push local unsynced chats, including deleted flags.
 * @returns Promise that resolves when the operation is complete.
 */
async function cloudPushChats() {
  const unsyncedChats = await localDb.chatsTable
    .filter((chat) => !chat.synced)
    .toArray();
  if (unsyncedChats.length === 0) return;
  try {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Each chat object includes the deleted flag if it has been marked as deleted.
      body: JSON.stringify({ unsyncedChats }),
    });
    if (response.ok) {
      const update = unsyncedChats.map((chat) => ({
        key: chat.id,
        changes: { synced: true },
      }));
      await localDb.chatsTable.bulkUpdate(update);
    } else {
      logger.error("Server error syncing chats:", unsyncedChats);
    }
  } catch (error) {
    logger.error("Sync failed for chats:", unsyncedChats, error);
  }
}

/**
 * Push local unsynced messages, including deleted flags.
 * @returns Promise that resolves when the operation is complete.
 */
async function cloudPushMessages() {
  const unsyncedMessages = await localDb.messagesTable
    .filter((msg) => !msg.synced)
    .toArray();
  if (unsyncedMessages.length === 0) return;
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Unsynced messages include the deleted property if set.
      body: JSON.stringify({ unsyncedMessages }),
    });
    if (response.ok) {
      const update = unsyncedMessages.map((msg) => ({
        key: msg.id,
        changes: { synced: true },
      }));
      await localDb.messagesTable.bulkUpdate(update);
    } else {
      logger.error("Server error syncing messages:", unsyncedMessages);
    }
  } catch (error) {
    logger.error("Sync failed for messages:", unsyncedMessages, error);
  }
}

/**
 * Push local changes to the server.
 * @returns Promise that resolves when the operation is complete.
 */
export async function cloudPush() {
  await cloudPushChats();
  await cloudPushMessages();
}

/**
 * Pull remote changes from the server.
 * @returns Promise that resolves with the updated messages and chats.
 */
export async function cloudPull() {
  const lastSync =
    localStorage.getItem("lastSync") || new Date(0).toISOString();
  try {
    const response = await fetch(
      `/api/sync?since=${encodeURIComponent(lastSync)}`,
    );
    if (response.ok) {
      const { messages, chats } = await response.json();

      const updatedMessages = [];
      const updatedChats = [];

      // Process remote messages
      for (const remoteMsg of messages) {
        const localMsg = await localDb.messagesTable.get(remoteMsg.id);
        if (!localMsg || new Date(remoteMsg.updatedAt) > localMsg.updatedAt) {
          const processedMessage = {
            ...remoteMsg,
            createdAt: new Date(remoteMsg.createdAt),
            updatedAt: new Date(remoteMsg.updatedAt),
          };
          await localDb.messagesTable.put(processedMessage);
          updatedMessages.push(processedMessage);
        }
      }

      // Process remote chats
      for (const remoteChat of chats) {
        const localChat = await localDb.chatsTable.get(remoteChat.id);
        if (
          !localChat ||
          new Date(remoteChat.updatedAt) > localChat.updatedAt
        ) {
          const processedChat = {
            ...remoteChat,
            createdAt: new Date(remoteChat.createdAt),
            updatedAt: new Date(remoteChat.updatedAt),
          };
          await localDb.chatsTable.put(processedChat);
          updatedChats.push(processedChat);
        }
      }

      localStorage.setItem("lastSync", new Date().toISOString());
      return { updatedMessages, updatedChats };
    } else {
      console.error("Pull sync failed with status:", response.status);
      return { updatedMessages: [], updatedChats: [] };
    }
  } catch (error) {
    console.error("Pull sync error:", error);
    return { updatedMessages: [], updatedChats: [] };
  }
}

/**
 * Perform a two-way sync with the server.
 * @returns Promise that resolves when the operation is complete.
 */
export async function cloudSync() {
  await cloudPush();
  await cloudPull();
}

/**
 * Debounced version of two-way sync function.
 * @returns Promise that resolves when the operation is complete.
 */
export const cloudDebounedSync = debounce(cloudSync, 500);
