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
    console.error("Error deleting chat session:", error);
    return false;
  }
}

/**
 * Stream message from LLM API and return chunks of the message as they are recieved
 */
export async function streamLlmResponse(
  messages: {
    role: string;
    content: string;
  }[],
  chatSessionId: string,
  onMessageChunk: (chunk: string) => void,
  abortController: AbortController,
  shouldGenerateTitle: boolean = false,
) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, sessionId: chatSessionId }),
      signal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error("Failed to fetch response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;
      onMessageChunk(chunk);
    }

    // Generate title if this is the first assistant response
    if (shouldGenerateTitle && fullResponse.trim().length > 0) {
      const title = await generateSessionTitle(messages);
      if (title) {
        await updateChatSession(chatSessionId, { title });
      }
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Stream aborted");
    } else {
      console.error("Error streaming message:", error);
    }
    return false;
  }
}

/**
 * Generate a title from the assistant's response
 */
export async function generateSessionTitle(
  messages: { role: string; content: string }[],
) {
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
    console.error("Error generating title:", error);
    return null;
  }
}
