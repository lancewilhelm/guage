import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";

// Define local message type
export interface LocalMessage {
  id: string;
  sessionId: string;
  parentId: string | null;
  childrenIds: string[] | null;
  content: string;
  role: "user" | "assistant";
  depth: number;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean; // Used to track messages that need syncing
}

// Define local chat type
export interface LocalChat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean; // Used to track sessions that need syncing
}

// Define the local database
class ChatDatabase extends Dexie {
  messagesTable!: EntityTable<LocalMessage, "id">;
  chatsTable!: EntityTable<LocalChat, "id">;

  constructor() {
    super("guage");

    this.version(1).stores({
      messagesTable: "&id, sessionId, lastUpdated",
      chatsTable: "&id, updatedAt",
    });
  }
}

// Initialize database
export const localDb = new ChatDatabase();

// ------------------------------
// Functions to interact with the local database
// ------------------------------
/**
 * Create a new message in the local database
 * @param message - The message object to insert in the local database
 * @returns Promise<void> - Resolves when the message has been inserted
 */
export async function insertMessageLocalDb(
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
}

/**
 * Create a message object with default values
 * @returns LocalMessage - A new message object with generated ID and timestamps
 */
export function createMessageObject(
  id: string | null = null,
  sessionId: string,
  role: "user" | "assistant",
  content: string = "",
  parentId: string | null = null,
  childrenIds: Array<string> | null = null,
  depth: number = 0,
): LocalMessage {
  return {
    id: id || uuidv4(),
    sessionId,
    parentId,
    childrenIds,
    content,
    role,
    depth,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };
}

/**
 * Retrieve messages from the local database for a given chat session
 * @param sessionId - The ID of the chat session
 * @returns Promise<LocalMessage[]> - An array of messages for the chat session
 */
export async function retrieveMessagesLocalDB(sessionId: string) {
  return await localDb.messagesTable
    .where("sessionId")
    .equals(sessionId)
    .toArray()
    .then((messages) =>
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    );
}

/**
 * Update the content of a message in the local database
 * @param messageId - The ID of the message to update
 * @param update - Object containing the new content
 */
export async function updateMessageLocalDB(
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
 * Delete a message from the local database
 * @param messageId - The ID of the message to delete
 */
export async function deleteMessageLocalDB(messageId: string) {
  await localDb.messagesTable.delete(messageId);
}

/**
 * Create a new chat in the local database
 * @param title - The title of the chat session (default: "New Chat")
 * @returns Promise<LocalChat> - The newly created chat session
 */
export async function createChatLocalDB(title: string = "New Chat") {
  const now = new Date();
  now.setDate(now.getDate() - 100);
  const newChat = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
    synced: false, // Used to track sessions that need syncing
  };
  await localDb.chatsTable.put(newChat);
  return newChat;
}

/**
 * Update the title of a chat session in the local database
 * @param chatId - The ID of the chat session to update
 * @param update - Object containing the new title
 */
export async function updateChatLocalDB(
  chatId: string,
  update: Partial<LocalChat>,
) {
  await localDb.chatsTable.update(chatId, {
    ...update,
    updatedAt: new Date(),
    synced: false,
  });
}

/**
 * Retrieve all chat sessions from the local database
 * @returns Promise<LocalChat[]> - An array of chat sessions
 */
export async function retrieveChatsLocalDB() {
  return await localDb.chatsTable
    .toArray()
    .then((chats) =>
      chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    );
}

/**
 * Delete a chat session from the local database and all associated messages
 * @param chatId - The ID of the chat session to delete
 */
export async function deleteChatLocalDB(chatId: string) {
  await localDb.chatsTable.delete(chatId);
  await localDb.messagesTable.where("sessionId").equals(chatId).delete();
}

// // ------------------------------
// // Sync local database with remote database
// // ------------------------------
// /**
//  * Sync the local databse with the remote database
//  */
// export async function syncWithPostgres() {
//   const unsyncedMessages = await localDb.messagesTable
//     .filter((msg) => !msg.synced)
//     .toArray();
//   const unsyncedSessions = await localDb.chatsTable
//     .filter((session) => !session.synced)
//     .toArray();
//
//   for (const msg of unsyncedMessages) {
//     try {
//       await fetch("/api/messages", {
//         method: "POST",
//         body: JSON.stringify(msg),
//         headers: { "Content-Type": "application/json" },
//       });
//
//       // Mark as synced in IndexedDB
//       await localDb.messagesTable.update(msg.id, { synced: true });
//     } catch (error) {
//       console.error("Sync failed for message:", msg.id, error);
//     }
//   }
//
//   for (const session of unsyncedSessions) {
//     try {
//       await fetch("/api/chat_sessions", {
//         method: "POST",
//         body: JSON.stringify(session),
//         headers: { "Content-Type": "application/json" },
//       });
//
//       // Mark as synced
//       await localDb.chatsTable.update(session.id, { synced: true });
//     } catch (error) {
//       console.error("Sync failed for session:", session.id, error);
//     }
//   }
// }

// // Run sync every 30 seconds
// setInterval(syncWithPostgres, 30000);
