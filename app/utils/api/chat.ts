import type { Model, Usage, MessageFile } from "~/utils/db/local";
import type { KnowledgeDocumentResponse } from "../../../server/utils/db/rag";

//------------------------//
//         Types          //
//------------------------//

export interface ApiMessage {
  id: string;
  chatId: string;
  userId: string;
  parentId: string | null;
  childrenIds: string[] | null;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  error?: string;
  model?: Model;
  deleted?: boolean;
  usage?: Usage;
  files?: MessageFile[];
  knowledge?: KnowledgeState;
  retrievedKnowledge?: KnowledgeDocumentResponse[];
}

export interface ApiChat {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
  activeBranch: string[];
  deleted?: boolean;
}

// Export types for compatibility with existing code
export type { Model, Usage, MessageFile };

//------------------------//
//     API Functions      //
//------------------------//

/**
 * Retrieve all chats from the server for the authenticated user.
 * @returns Promise that resolves with an array of chats.
 */
export async function apiRetrieveChats(): Promise<ApiChat[]> {
  try {
    const response = await $fetch<{ success: boolean; data: ApiChat[] }>(
      "/api/chats",
      {
        method: "GET",
      },
    );

    if (!response.success) {
      throw new Error("Failed to retrieve chats");
    }

    // Convert date strings to Date objects
    return response.data.map((chat) => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
      activeBranch: chat.activeBranch || [],
    }));
  } catch (error) {
    logger.error("Failed to retrieve chats from API:", error);
    throw new Error(
      `Failed to retrieve chats: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieve a single chat from the server by ID.
 * @param chatId The ID of the chat to retrieve.
 * @returns Promise that resolves with the chat.
 */
export async function apiRetrieveChat(chatId: string): Promise<ApiChat | null> {
  try {
    const response = await $fetch<{ success: boolean; data: ApiChat }>(
      `/api/chats/${chatId}`,
      {
        method: "GET",
      },
    );

    if (!response.success) {
      return null;
    }

    // Convert date strings to Date objects
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      activeBranch: response.data.activeBranch || [],
    };
  } catch (error) {
    logger.error(`Failed to retrieve chat ${chatId} from API:`, error);
    return null;
  }
}

/**
 * Retrieve messages from the server for a given chat.
 * @param chatId The ID of the chat to retrieve messages for.
 * @returns Promise that resolves with an array of messages.
 */
export async function apiRetrieveMessages(
  chatId: string,
): Promise<ApiMessage[]> {
  try {
    const response = await $fetch<{ success: boolean; data: ApiMessage[] }>(
      "/api/messages",
      {
        method: "GET",
        query: { chatId },
      },
    );

    if (!response.success) {
      throw new Error("Failed to retrieve messages");
    }

    // Convert date strings to Date objects
    return response.data.map((message) => ({
      ...message,
      createdAt: new Date(message.createdAt),
      updatedAt: new Date(message.updatedAt),
      synced: true, // Messages from API are already synced
    }));
  } catch (error) {
    logger.error(
      `Failed to retrieve messages for chat ${chatId} from API:`,
      error,
    );
    throw new Error(
      `Failed to retrieve messages: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Create a chat on the server.
 * @param title The title of the chat.
 * @returns Promise that resolves with the created chat.
 */
export async function apiCreateChat(
  title: string = "New Chat",
  _date: Date = new Date(),
): Promise<ApiChat> {
  try {
    const response = await $fetch<{ success: boolean; data: ApiChat }>(
      "/api/chats",
      {
        method: "POST",
        body: { title },
      },
    );

    if (!response.success) {
      throw new Error("Failed to create chat");
    }

    // Convert date strings to Date objects
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      activeBranch: response.data.activeBranch || [],
    };
  } catch (error) {
    logger.error("Failed to create chat via API:", error);
    throw new Error(
      `Failed to create chat: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Update a chat on the server.
 * @param chatId The ID of the chat to update.
 * @param update The properties to update.
 * @returns Promise that resolves when the operation is complete.
 */
export async function apiUpdateChat(
  chatId: string,
  update: Partial<ApiChat>,
): Promise<void> {
  try {
    const response = await $fetch<{ success: boolean }>(
      `/api/chats/${chatId}`,
      {
        method: "PATCH",
        body: update,
      },
    );

    if (!response.success) {
      throw new Error("Failed to update chat");
    }
  } catch (error) {
    logger.error(`Failed to update chat ${chatId} via API:`, error);
    throw new Error(
      `Failed to update chat: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Create a message on the server.
 * @param message The message to create.
 * @returns Promise that resolves with the created message.
 */
export async function apiCreateMessage(
  message: Omit<ApiMessage, "userId" | "createdAt" | "updatedAt">,
): Promise<ApiMessage> {
  try {
    const response = await $fetch<{ success: boolean; data: ApiMessage }>(
      "/api/messages",
      {
        method: "POST",
        body: message,
      },
    );

    if (!response.success) {
      throw new Error("Failed to create message");
    }

    // Convert date strings to Date objects
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      synced: true, // Messages from API are already synced
    };
  } catch (error) {
    logger.error("Failed to create message via API:", error);
    throw new Error(
      `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Update a message on the server.
 * @param messageId The ID of the message to update.
 * @param update The properties to update.
 * @returns Promise that resolves when the operation is complete.
 */
export async function apiUpdateMessage(
  messageId: string,
  update: Partial<ApiMessage>,
): Promise<void> {
  try {
    const response = await $fetch<{ success: boolean }>(
      `/api/messages/${messageId}`,
      {
        method: "PATCH",
        body: update,
      },
    );

    if (!response.success) {
      throw new Error("Failed to update message");
    }
  } catch (error) {
    logger.error(`Failed to update message ${messageId} via API:`, error);
    throw new Error(
      `Failed to update message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Mark a chat as deleted on the server.
 * @param chatId The ID of the chat to mark as deleted.
 * @returns Promise that resolves when the operation is complete.
 */
export async function apiMarkChatDeleted(chatId: string): Promise<void> {
  try {
    const response = await $fetch<{ success: boolean }>(
      `/api/chats/${chatId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.success) {
      throw new Error("Failed to delete chat");
    }
  } catch (error) {
    logger.error(`Failed to delete chat ${chatId} via API:`, error);
    throw new Error(
      `Failed to delete chat: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Mark a message as deleted on the server.
 * @param messageId The ID of the message to mark as deleted.
 * @returns Promise that resolves when the operation is complete.
 */
export async function apiMarkMessageDeleted(messageId: string): Promise<void> {
  try {
    const response = await $fetch<{ success: boolean }>(
      `/api/messages/${messageId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.success) {
      throw new Error("Failed to delete message");
    }
  } catch (error) {
    logger.error(`Failed to delete message ${messageId} via API:`, error);
    throw new Error(
      `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
