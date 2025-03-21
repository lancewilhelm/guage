import { logger } from "@/utils/logger";
import { LocalMessage } from "./db/localDb";

/**
 * Create new chat session
 */
export async function createChatSession() {
  try {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "New Chat Session",
        conversationType: "chat",
      }),
    });

    if (!response.ok) throw new Error("Failed to create chat session");

    const newChatSession = await response.json();
    return newChatSession;
  } catch (error) {
    console.error("Error creating chat session:", error);
    return null;
  }
}

/**
 * Fetch the chat sessions from the backend
 */
export async function fetchChatSessions() {
  try {
    const response = await fetch("/api/chat/sessions");
    if (!response.ok) throw new Error("Failed to fetch chat sessions");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return null;
  }
}

/**
 * Update a chat session by ID
 */
export async function updateChatSession(sessionId: string, updateData: object) {
  try {
    const response = await fetch("/api/chat/sessions", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, ...updateData }),
    });

    if (!response.ok) throw new Error("Failed to update chat session");

    const updatedChatSession = await response.json();
    return updatedChatSession;
  } catch (error) {
    console.error("Error updating chat session:", error);
    return null;
  }
}

/**
 * Delete a chat session by ID
 */
export async function deleteChatSession(sessionId: string) {
  try {
    const response = await fetch("/api/chat/sessions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) throw new Error("Failed to delete chat session");

    return true;
  } catch (error) {
    logger.error("Error deleting chat session:", error);
    return false;
  }
}

/**
 * Generate a title from the assistant's response
 */
export async function generateSessionTitle(messages: LocalMessage[]) {
  try {
    const response = await fetch("/api/chat/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) throw new Error("Failed to generate title");

    const title = await response.json();
    return title;
  } catch (error) {
    logger.error("Error generating title:", error);
    return null;
  }
}

export interface SSEChunk {
  eventType: string;
  data: string;
}

export function parseSSEChunk(chunk: string): SSEChunk[] {
  const events = chunk.split("\n\n");
  const parsedEvents: SSEChunk[] = [];
  for (const event of events) {
    const lines = event.split("\n");
    const eventType = lines[0]?.replace("event: ", "");
    const data = lines[1]?.replace("data: ", "");
    parsedEvents.push({ eventType, data });
  }
  return parsedEvents;
}
