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
 * Update a chat session by ID
 */
export const updateChatSession = async (
  sessionId: string,
  updateData: object,
) => {
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
