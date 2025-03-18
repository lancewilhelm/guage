import { logger } from "@/utils/logger";
import { DisplayMessage, TempMessage } from "@/app/(auth)/chat/page";
import { SelectMessage } from "@/utils/db/schema";

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
export async function generateSessionTitle(messages: SelectMessage[]) {
  logger.debug("generateSessionTitle:", { messages });
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

function parseSSEChunk(chunk: string): SSEChunk[] {
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

/**
 * Stream message from LLM API and return chunks of the message as they are recieved
 */
export async function streamLlmResponse(
  messages: DisplayMessage[],
  userMessage: TempMessage,
  chatSessionId: string,
  onMessageChunk: ({ eventType, data }: SSEChunk) => void,
  abortController: AbortController,
  shouldGenerateTitle: boolean = false,
) {
  let insertUserMessageResult: SelectMessage | undefined;
  let insertAsssistantMessageResult: SelectMessage | undefined;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: messages,
        userMessage: userMessage,
        sessionId: chatSessionId,
      }),
      signal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error("Failed to fetch response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunks = parseSSEChunk(decoder.decode(value));
      for (const chunk of chunks) {
        if (chunk.eventType === "userMessage") {
          insertUserMessageResult = JSON.parse(chunk.data) as SelectMessage;
        } else if (chunk.eventType === "assistantMessage") {
          insertAsssistantMessageResult = JSON.parse(
            chunk.data,
          ) as SelectMessage;
        }

        onMessageChunk(chunk);
      }
    }

    // Generate title if this is the first assistant response
    if (
      shouldGenerateTitle &&
      insertUserMessageResult &&
      insertAsssistantMessageResult
    ) {
      const title = await generateSessionTitle([
        insertUserMessageResult,
        insertAsssistantMessageResult,
      ]);
      if (title) {
        await updateChatSession(chatSessionId, { title });
      }
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Generate title if this is the first assistant response
      if (
        shouldGenerateTitle &&
        insertUserMessageResult &&
        insertAsssistantMessageResult
      ) {
        const title = await generateSessionTitle([
          insertUserMessageResult,
          insertAsssistantMessageResult,
        ]);
        if (title) {
          await updateChatSession(chatSessionId, { title });
        }
      }
    } else {
      logger.error("Error streaming response:", error);
    }
    return false;
  }
}
