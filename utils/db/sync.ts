import { localDb } from "./localDb";

export async function syncWithPostgres() {
  const unsyncedMessages = await localDb.messages
    .where("synced")
    .equals(false)
    .toArray();
  const unsyncedSessions = await localDb.chatSessions
    .where("synced")
    .equals(false)
    .toArray();

  for (const msg of unsyncedMessages) {
    try {
      await fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify(msg),
        headers: { "Content-Type": "application/json" },
      });

      // Mark as synced in IndexedDB
      await localDb.messages.update(msg.id, { synced: true });
    } catch (error) {
      console.error("Sync failed for message:", msg.id, error);
    }
  }

  for (const session of unsyncedSessions) {
    try {
      await fetch("/api/chat_sessions", {
        method: "POST",
        body: JSON.stringify(session),
        headers: { "Content-Type": "application/json" },
      });

      // Mark as synced
      await localDb.chatSessions.update(session.id, { synced: true });
    } catch (error) {
      console.error("Sync failed for session:", session.id, error);
    }
  }
}

// Run sync every 30 seconds
setInterval(syncWithPostgres, 30000);
