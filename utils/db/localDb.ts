import Dexie, { Table } from "dexie";

// Define local message type
export interface LocalMessage {
  id: string;
  sessionId: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  lastUpdated: Date;
  synced: boolean; // Used to track messages that need syncing
}

// Define local chat session type
export interface LocalChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  conversationType: string;
  synced: boolean; // Used to track sessions that need syncing
}

// Dexie Database Class
class ChatDatabase extends Dexie {
  messages!: Table<LocalMessage>;
  chatSessions!: Table<LocalChatSession>;

  constructor() {
    super("chatDB");

    this.version(1).stores({
      messages: "id, sessionId, lastUpdated, synced",
      chatSessions: "id, userId, updatedAt, synced",
    });
  }
}

// Initialize database
export const localDb = new ChatDatabase();

// Helper functions
// Messages
export async function saveMessageToIndexedDB(message: LocalMessage) {
  await localDb.messages.put({ ...message, synced: false });
}

export async function getMessagesFromIndexedDB(sessionId: string) {
  return await localDb.messages.where("sessionId").equals(sessionId).toArray();
}

// Chat Sessions
export async function saveChatSessionToIndexedDB(session: LocalChatSession) {
  await localDb.chatSessions.put({ ...session, synced: false });
}

export async function getChatSessionsFromIndexedDB() {
  return await localDb.chatSessions.toArray();
}
