import { logger } from "~/utils/logger";
import { useChatStore } from "~/stores/chat";
import {
  dbCreateChat,
  dbCreateMessage,
  dbUpdateChat,
  dbUpdateMessage,
  dbRetrieveMessages,
  type LocalMessage,
  type LocalChat,
  type Model,
  type MessageFile,
} from "./db/local";
import { v4 as uuidv4 } from "uuid";
import type { ChatState } from "~/stores/chat";
import { streamAndUpdateAssistantMessage } from "./llm/streamAndUpdateAssistantMessage";
import type { KnowledgeDocumentResponse } from "~~/server/utils/db/rag";

/**
 * Generate a title from the assistant's response
 * @param userMessage The user's message
 * @returns The generated title
 */
export async function generateChatTitle(userMessage: LocalMessage) {
  try {
    const response = await $fetch<string>("/api/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage,
        model: !useUserSettingsStore().settings.titleModel
          ? useUserSettingsStore().settings.model
          : useUserSettingsStore().settings.titleModel,
      }),
    });

    // if (!response.ok) throw new Error("Failed to generate title");
    return response;
  } catch (error) {
    logger.error("Error generating title:", error);
    return null;
  }
}

export interface SSEChunk {
  eventType: string;
  data: string;
}

/**
 * Parse the SSE chunk into an array of events
 * @param chunk The SSE chunk to parse
 * @returns An array of parsed events
 */
export function parseSSEChunk(chunk: string): SSEChunk[] {
  const events = chunk.split("\n\n");
  const parsedEvents: SSEChunk[] = [];
  for (const event of events) {
    const lines = event.split("\n");
    const eventType = lines[0]?.replace("event: ", "");
    const data = lines[1]?.replace("data: ", "");
    if (!eventType || !data) continue;
    parsedEvents.push({ eventType, data });
  }
  return parsedEvents;
}

/**
 * Handles submitting a new message to the chat
 * This directly appends the user's message to the chat and streams the response
 * @param userInput The input string from user
 * @param router The router instance
 */
export async function handleSubmitMessage(
  userInput: string,
  files?: MessageFile[],
) {
  if (!userInput?.trim()) return;

  // Get the necessary references
  const chatStore = useChatStore();

  // If there's no chat ID, create a new chat
  let chatIdToUse = chatStore.currentChatId;
  if (!chatIdToUse) {
    const newChat = await dbCreateChat();
    if (newChat) {
      chatStore.createChat(
        newChat.id,
        newChat.title,
        newChat.createdAt,
        newChat.updatedAt,
      );
      chatStore.setCurrentChatId(newChat.id);
      chatIdToUse = newChat.id;
    }
  }

  if (!chatIdToUse) return;
  navigateTo(`/chat/${chatIdToUse}`);

  chatStore.setChatStreaming(chatIdToUse, true);

  const chat = chatStore.chats[chatIdToUse];
  if (!chat) return;

  // Find parent message if it exists
  const parentId = findLastAssistantMessageId(chat);

  // Create and persist message pair
  const { userMessage, assistantMessage } = createMessagePair(
    chatIdToUse,
    userInput,
    parentId,
    files,
  );

  // Update UI and storage
  await updateChatAndGetResponse(
    chatIdToUse,
    userMessage,
    assistantMessage,
    parentId,
    chat,
  );
}

/**
 * Handles editing a message in the chat
 * This directly updates the message in the chat and streams the response
 * @param editedMessage The edited message
 */
export async function handleEditMessage(editedMessage: LocalMessage) {
  const chatStore = useChatStore();
  if (!chatStore.currentChatId) return;

  const chat = chatStore.chats[chatStore.currentChatId];
  if (!chat) return;

  // Handle editing of an assistant message
  if (editedMessage.role === "assistant") {
    // Update the message in the store and database
    chatStore.updateMessage(chatStore.currentChatId, editedMessage.id, {
      content: editedMessage.content,
      updatedAt: new Date(),
    });
    dbUpdateMessage(editedMessage.id, { content: editedMessage.content });
    return;
  }

  // Handle editing of a user message
  chatStore.setChatStreaming(chatStore.currentChatId, true);

  const parentId = editedMessage.parentId;

  // Create and persist message pair
  const { userMessage, assistantMessage } = createMessagePair(
    chatStore.currentChatId,
    editedMessage.content,
    parentId,
  );

  // Update UI and storage
  await updateChatAndGetResponse(
    chatStore.currentChatId,
    userMessage,
    assistantMessage,
    parentId,
    chat,
  );
}

/**
 * Handles regenerating an assistant message in the chat
 * This will create a new branch and stream the response
 * @param targetMessage The edited message
 */
export async function handleRegenerateMessage(targetMessage: LocalMessage) {
  const chatStore = useChatStore();
  if (!chatStore.currentChatId) return;

  const chat = chatStore.chats[chatStore.currentChatId];
  if (!chat) return;

  // Handle editing of a user message
  chatStore.setChatStreaming(chatStore.currentChatId, true);

  const parentId = targetMessage.parentId;

  // Create and persist message pair
  const assistantMessage = createAssistantMessage(
    chatStore.currentChatId,
    parentId,
  );

  // Update UI and storage
  await updateChatAndGetResponse(
    chatStore.currentChatId,
    null,
    assistantMessage,
    parentId,
    chat,
  );
}

/**
 * Creates a new assistant message
 * @param chatId The chat ID
 * @param parentId The parent message ID
 * @returns The created assistant message
 */
function createAssistantMessage(chatId: string, parentId: string | null) {
  const assistantMessageId = uuidv4();
  const now = new Date();
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User is not authenticated");
  }

  const assistantMessage: LocalMessage = {
    id: assistantMessageId,
    chatId,
    userId: user.value.id,
    content: "",
    role: "assistant",
    parentId,
    childrenIds: [],
    createdAt: now,
    updatedAt: now,
    synced: false,
    model: useUserSettingsStore().settings.model,
  };

  // Persist messages to IndexedDB
  dbCreateMessage([assistantMessage]);

  return assistantMessage;
}

/**
 * Creates a pair of user and assistant messages
 * @param chatId The chat ID
 * @param content The message content
 * @param parentId The parent message ID
 * @returns The user and assistant messages
 */
function createMessagePair(
  chatId: string,
  content: string,
  parentId: string | null,
  files?: MessageFile[],
): { userMessage: LocalMessage; assistantMessage: LocalMessage } {
  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();
  const userSettingsStore = useUserSettingsStore();
  const model = { ...userSettingsStore.settings.model } as Model;
  if (!model) {
    throw new Error("Model is not set");
  }

  const now = new Date();
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User is not authenticated");
  }

  const knowledge = useUserSettingsStore().settings.activeKnowledge;
  const activeKnowledge = knowledge
    ? useKnowledgeStore().knowledge[knowledge]
    : undefined;

  const userMessage: LocalMessage = {
    id: userMessageId,
    chatId,
    userId: user.value.id,
    content,
    role: "user",
    parentId,
    childrenIds: [assistantMessageId],
    createdAt: now,
    updatedAt: now,
    synced: false,
    files: [...(files || [])],
    knowledge: activeKnowledge,
  };

  const assistantMessage: LocalMessage = {
    id: assistantMessageId,
    chatId,
    userId: user.value.id,
    content: "",
    role: "assistant",
    parentId: userMessageId,
    childrenIds: [],
    createdAt: now,
    updatedAt: now,
    synced: false,
    model,
    knowledge: activeKnowledge,
  };

  // Persist messages to IndexedDB
  dbCreateMessage([{ ...userMessage }, { ...assistantMessage }]);

  return { userMessage, assistantMessage };
}

/**
 * Finds the ID of the last assistant message in the active branch
 * @param chat The chat state
 * @returns The ID of the last assistant message
 */
function findLastAssistantMessageId(chat: ChatState): string | null {
  if (!chat || !chat.activeBranch || chat.activeBranch.length === 0)
    return null;

  const lastMessageId = chat.activeBranch[chat.activeBranch.length - 1];
  if (!lastMessageId) return null;
  const lastMessage = chat.messages[lastMessageId];

  return lastMessage && lastMessage.role === "assistant"
    ? lastMessage.id
    : null;
}

/**
 * Updates chat with new messages, handles branch editing and streams response
 * @param chatId The chat ID
 * @param userMessage The user's message
 * @param assistantMessage The assistant's message
 * @param parentId The parent message ID
 * @param chat The chat state
 */
async function updateChatAndGetResponse(
  chatId: string,
  userMessage: LocalMessage | null,
  assistantMessage: LocalMessage,
  parentId: string | null,
  chat: ChatState,
) {
  const chatStore = useChatStore();
  const now = new Date();

  if (!chatStore.chats[chatId]) return;

  // Update parent's childrenIds if applicable
  if (parentId) {
    const parent = chat?.messages[parentId];
    if (parent) {
      const updatedChildren = parent.childrenIds
        ? [
            ...parent.childrenIds,
            userMessage ? userMessage.id : assistantMessage.id,
          ]
        : [userMessage ? userMessage.id : assistantMessage.id];
      dbUpdateMessage(parentId, { childrenIds: updatedChildren });
      chatStore.addMessage(chatId, { ...parent, childrenIds: updatedChildren });
    }
  }

  // Update state
  if (userMessage) chatStore.addMessage(chatId, userMessage);
  chatStore.addMessage(chatId, assistantMessage);

  // Update the branch
  chatStore.editBranch(
    chatId,
    parentId,
    userMessage ? userMessage.id : assistantMessage.id,
  );

  chatStore.updateChatMetadata(chatId, { updatedAt: now });

  // Make sure we update the local DB with the new active branch immediately
  const updatedBranch = chatStore.chats[chatId].activeBranch;
  dbUpdateChat(chatId, {
    activeBranch: [...updatedBranch],
    updatedAt: now,
  });

  // Handle RAG if applicable
  if (assistantMessage.knowledge && userMessage?.content) {
    const knowledgeName = assistantMessage.knowledge.name;
    const response = await $fetch<{ knowledge: KnowledgeDocumentResponse[] }>(
      "/api/knowledge/document",
      {
        method: "GET",
        params: {
          knowledgeName,
          type: "vector",
          query: userMessage.content,
        },
      },
    );
    if (!response) {
      throw new Error("Failed to retrieve knowledge");
    }

    assistantMessage.retrievedKnowledge = response.knowledge;
    dbUpdateMessage(assistantMessage.id, {
      retrievedKnowledge: response.knowledge,
    });
    chatStore.updateMessage(chatId, assistantMessage.id, {
      retrievedKnowledge: response.knowledge,
    });
  }

  let messageHistory = chat.activeBranch
    .map((id: string) => chat.messages[id])
    .filter(Boolean) as LocalMessage[];

  // Add any retreived knowledge to the user messages
  messageHistory = messageHistory.map((m, i, arr) => {
    if (m.role === "user" && m.knowledge) {
      const retrievedKnowledge = arr[i + 1]?.retrievedKnowledge;
      if (retrievedKnowledge) {
        return {
          ...m,
          content:
            m.content +
            "\n\n" +
            "Respond the user's message above using the following retreived knowledge if applicable. Include citations to the document name when referencing the retreived knowledge:\n" +
            retrievedKnowledge
              .map((doc) => `- ${doc.source}:\n\n${doc.text}`)
              .join("\n"),
        };
      }
    }
    return m;
  });

  // Expand any attached files in the user messages
  messageHistory = messageHistory.map((m) => {
    if (m.files?.length) {
      return {
        ...m,
        content:
          m.content +
          "\n\n" +
          "Attached files:\n" +
          m.files.map((file) => file.name + "\n\n" + file.text).join("\n"),
      };
    }
    return m;
  });

  // Remove the assistant message from the history
  messageHistory = messageHistory.slice(0, -1);

  await streamAndUpdateAssistantMessage({
    chatId,
    assistantMessageId: assistantMessage.id,
    history: messageHistory,
  });

  // Update chat title and timestamp
  const isFirstMessage =
    !chat.activeBranch.length ||
    (userMessage &&
      chat.activeBranch.length === 2 &&
      chat.activeBranch.includes(userMessage.id) &&
      chat.activeBranch.includes(assistantMessage.id));

  if (isFirstMessage && userMessage) {
    const title = await generateChatTitle(userMessage);
    if (!title) return;
    dbUpdateChat(chatId, {
      title,
      updatedAt: now,
      activeBranch: [...chatStore.chats[chatId].activeBranch],
    });
    chatStore.updateChatMetadata(chatId, { title, updatedAt: now });
  } else {
    dbUpdateChat(chatId, {
      updatedAt: now,
      activeBranch: [...chatStore.chats[chatId].activeBranch],
    });
    chatStore.updateChatMetadata(chatId, { updatedAt: now });
  }
}

/**
 * Preload messages for a list of chats
 * This is used to load the most recent messages for pinned chats
 * and the most recent 10 messages for unpinned chats
 * @param chats The list of chats available
 */
export async function preloadChats(chats: LocalChat[]) {
  if (!chats || chats.length === 0) return;

  try {
    const chatStore = useChatStore();

    // First, separate pinned chats
    const pinnedChats = chats.filter((chat) => chat.pinned);
    const unpinnedChats = chats.filter((chat) => !chat.pinned);

    // Sort unpinned chats by most recent
    const sortedUnpinnedChats = unpinnedChats.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    // Take the most recent 10 chats (or fewer if there aren't 10)
    const recentChats = sortedUnpinnedChats.slice(0, 10);

    // Combine pinned and recent chats, with pinned taking priority
    const chatsToPreload = [...pinnedChats, ...recentChats];

    // Preload each chat's messages
    for (const chat of chatsToPreload) {
      // Skip if messages are already loaded
      const chatFromStore = chatStore.chats[chat.id];
      if (chatFromStore && Object.keys(chatFromStore.messages).length > 0) {
        continue;
      }

      // Load messages for this chat
      const messages = await dbRetrieveMessages(chat.id);
      if (messages && messages.length > 0) {
        // Add messages to the store
        messages.forEach((msg: LocalMessage) => {
          chatStore.addMessage(chat.id, msg);
        });

        // Give a small delay between chat loads to avoid blocking the main thread
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error("Error preloading chat messages:", error);
  }
}
