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
} from "./db/local";
import { v4 as uuidv4 } from "uuid";
import type { ChatState } from "~/stores/chat";
import { streamAndUpdateAssistantMessage } from "./llm/streamAndUpdateAssistantMessage";
// import { useUserSettingsStore } from "~/store/userSettingsStore";

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
export async function handleSubmitMessage(userInput: string) {
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

  chatStore.setChatStreaming(chatStore.currentChatId, true);

  const chat = chatStore.chats[chatStore.currentChatId];
  if (!chat) return;

  const parentId = editedMessage.parentId;
  const history = getMessageHistoryUpToParent(chat, parentId);

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
    history,
  );
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
): { userMessage: LocalMessage; assistantMessage: LocalMessage } {
  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();
  const userSettingsStore = useUserSettingsStore();
  const model = { ...userSettingsStore.settings.model } as Model;
  if (!model) {
    throw new Error("Model is not set");
  }

  const now = new Date();
  const userMessage: LocalMessage = {
    id: userMessageId,
    chatId,
    content,
    role: "user",
    parentId,
    childrenIds: [assistantMessageId],
    createdAt: now,
    updatedAt: now,
    synced: false,
  };

  const assistantMessage: LocalMessage = {
    id: assistantMessageId,
    chatId,
    content: "",
    role: "assistant",
    parentId: userMessageId,
    childrenIds: [],
    createdAt: now,
    updatedAt: now,
    synced: false,
    model,
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
 * Gets the message history up to and including the parent message
 */
function getMessageHistoryUpToParent(
  chat: ChatState,
  parentId: string | null,
): LocalMessage[] {
  if (!parentId || !chat) return [];

  const parentIndex = chat.activeBranch.indexOf(parentId);
  if (parentIndex === -1) return [];

  return chat.activeBranch
    .slice(0, parentIndex + 1)
    .map((id: string) => chat.messages[id])
    .filter(Boolean) as LocalMessage[];
}

/**
 * Updates chat with new messages, handles branch editing and streams response
 * @param chatId The chat ID
 * @param userMessage The user's message
 * @param assistantMessage The assistant's message
 * @param parentId The parent message ID
 * @param chat The chat state
 * @param history The chat history
 */
async function updateChatAndGetResponse(
  chatId: string,
  userMessage: LocalMessage,
  assistantMessage: LocalMessage,
  parentId: string | null,
  chat: ChatState,
  history?: LocalMessage[],
) {
  const chatStore = useChatStore();
  const now = new Date();

  if (!chatStore.chats[chatId]) return;

  // Update parent's childrenIds if applicable
  if (parentId) {
    const parent = chat?.messages[parentId];
    if (parent) {
      const updatedChildren = parent.childrenIds
        ? [...parent.childrenIds, userMessage.id]
        : [userMessage.id];
      dbUpdateMessage(parentId, { childrenIds: updatedChildren });
      chatStore.addMessage(chatId, { ...parent, childrenIds: updatedChildren });
    }
  }

  // Update state
  chatStore.addMessage(chatId, userMessage);
  chatStore.addMessage(chatId, assistantMessage);

  // Update the branch
  chatStore.editBranch(chatId, parentId, userMessage.id);

  chatStore.updateChatMetadata(chatId, { updatedAt: now });

  // Make sure we update the local DB with the new active branch immediately
  const updatedBranch = chatStore.chats[chatId].activeBranch;
  dbUpdateChat(chatId, {
    activeBranch: [...updatedBranch],
    updatedAt: now,
  });

  // Stream the response
  const messageHistory =
    history ||
    (chat.activeBranch
      .map((id: string) => chat.messages[id])
      .filter(Boolean) as LocalMessage[]);

  await streamAndUpdateAssistantMessage({
    chatId,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    history: messageHistory,
  });

  // Update chat title and timestamp
  const isFirstMessage =
    !chat.activeBranch.length ||
    (chat.activeBranch.length === 2 &&
      chat.activeBranch.includes(userMessage.id) &&
      chat.activeBranch.includes(assistantMessage.id));

  if (isFirstMessage) {
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
