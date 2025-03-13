/**
 * Fetch the chat sessions from the backend
 */
export const fetchChatSessions = async () => {
  try {
    const response = await fetch("/api/chat/sessions");
    if (!response.ok) throw new Error("Failed to fetch chat sessions");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return null;
  }
};

/**
 * Create new chat session
 */
export const createChatSession = async () => {
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
};

/**
 * Delete a chat session by ID
 */
export const deleteChatSession = async (sessionId: string) => {
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
};
