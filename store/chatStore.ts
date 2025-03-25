import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "@/utils/logger";
// Types
import { LocalMessage } from "@/utils/db/local";

export interface ChatState {
  messages: Record<string, LocalMessage>;
  activeBranch: string[];
  isStreaming: boolean;
  abortController?: AbortController;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
}

export interface ChatStore {
  chats: Record<string, ChatState>;
  currentChatId?: string;
  // Actions
  createChat: (
    chatId: string,
    title?: string,
    createdAt?: Date,
    updatedAt?: Date,
    activeBranch?: string[],
    pinned?: boolean,
  ) => void;
  setCurrentChatId: (chatId: string | undefined) => void;
  updateChatMessages: (
    chatId: string,
    messages: Record<string, LocalMessage>,
  ) => void;
  setChatStreaming: (chatId: string, isStreaming: boolean) => void;
  setChatAbortController: (
    chatId: string,
    controller?: AbortController,
  ) => void;
  addMessage: (chatId: string, message: LocalMessage) => void;
  updateMessage: (chatId: string, id: string, content: string) => void;
  setActiveBranch: (chatId: string, branch?: string[]) => void;
  editBranch: (
    chatId: string,
    parentId: string | null,
    newUserMessageId: string,
  ) => void;
  changeBranch: (
    chatId: string,
    messageId: string,
    newVersionIndex: number,
  ) => void;
  updateChatMetadata: (
    chatId: string,
    metadata: Partial<
      Pick<
        ChatState,
        | "title"
        | "createdAt"
        | "updatedAt"
        | "pinned"
        | "isStreaming"
        | "abortController"
      >
    >,
  ) => void;
  deleteChat: (chatId: string) => void;
  resetChatStore: () => void;
}

/**
 * Generate an active branch starting from the latest message.
 * @param messages - Record of messages
 * @returns Array of message IDs in the branch
 */
export function generateActiveBranchFromLatest(
  messages: Record<string, LocalMessage>,
): string[] {
  const allMessages = Object.values(messages);
  if (allMessages.length === 0) return [];
  // Get the latest message based on createdAt.
  const latest = allMessages.reduce((prev, curr) =>
    new Date(curr.updatedAt) > new Date(prev.updatedAt) ? curr : prev,
  );
  const branch: string[] = [];
  let current: LocalMessage | undefined = latest;
  while (current) {
    branch.push(current.id);
    if (!current.parentId) break;
    current = messages[current.parentId];
  }
  return branch.reverse();
}

/**
 * Build a branch starting from a message and following the first-child chain.
 * @param chat - Chat state
 * @param startId - Starting message ID
 * @returns Array of message IDs in the branch
 */
function buildBranchFrom(chat: ChatState, startId: string): string[] {
  const branch: string[] = [];
  branch.push(startId);
  let current = chat.messages[startId];
  while (current && current.childrenIds && current.childrenIds.length > 0) {
    const firstChildId = current.childrenIds[0];
    branch.push(firstChildId);
    current = chat.messages[firstChildId];
  }
  return branch;
}

/**
 * ChatStore: Zustand store for chats.
 * Maintains chats, messages, and active branches.
 */
export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chats: {},
      currentChatId: undefined,
      setCurrentChatId: (chatId) =>
        set((state) => {
          if (chatId === undefined) {
            return { currentChatId: undefined };
          } else if (!state.chats[chatId]) {
            logger.warn(`Chat ${chatId} does not exist.`);
            return { currentChatId: undefined };
          }
          return {
            currentChatId: chatId,
          };
        }),
      createChat: (
        chatId,
        title?,
        createdAt?,
        updatedAt?,
        activeBranch?,
        pinned?,
      ) =>
        set((state) => {
          if (state.chats[chatId]) {
            return state;
          }
          const newChat: ChatState = {
            messages: {},
            activeBranch: activeBranch ?? [],
            isStreaming: false,
            title: title ?? "New Chat",
            createdAt: createdAt ?? new Date(),
            updatedAt: updatedAt ?? new Date(),
            pinned: pinned ?? false,
          };
          return {
            chats: {
              ...state.chats,
              [chatId]: newChat,
            },
          };
        }),
      updateChatMessages: (chatId, messages) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [chatId]: {
              ...state.chats[chatId],
              messages,
            },
          },
        })),
      setChatStreaming: (chatId, isStreaming) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [chatId]: {
              ...state.chats[chatId],
              isStreaming,
            },
          },
        })),
      setChatAbortController: (chatId, controller) =>
        set((state) => {
          if (state.chats[chatId]?.abortController) {
            state.chats[chatId].abortController.abort();
          }
          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...state.chats[chatId],
                abortController: controller,
              },
            },
          };
        }),
      addMessage: (chatId, message) =>
        set((state) => {
          const chat = state.chats[chatId];
          const newMessages = { ...chat.messages, [message.id]: message };
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, messages: newMessages },
            },
          };
        }),
      updateMessage: (chatId, id, content) =>
        set((state) => {
          const chat = state.chats[chatId];
          const updatedMessages = {
            ...chat.messages,
            [id]: { ...chat.messages[id], content },
          };
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, messages: updatedMessages },
            },
          };
        }),
      setActiveBranch: (chatId: string, branch?: string[]) =>
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;
          const newBranch =
            branch ?? generateActiveBranchFromLatest(chat.messages);
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, activeBranch: newBranch },
            },
          };
        }),
      editBranch: (chatId, parentId, newUserMessageId) =>
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;
          let newActiveBranch: string[];
          if (!parentId) {
            newActiveBranch = buildBranchFrom(chat, newUserMessageId);
          } else {
            const parentIndex = chat.activeBranch.indexOf(parentId);
            const prefix =
              parentIndex !== -1
                ? chat.activeBranch.slice(0, parentIndex + 1)
                : [];
            const newSegment = buildBranchFrom(chat, newUserMessageId);
            newActiveBranch = [...prefix, ...newSegment];
          }
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, activeBranch: newActiveBranch },
            },
          };
        }),
      changeBranch: (chatId, messageId, newVersionIndex) =>
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;
          const targetMessage = chat.messages[messageId];
          if (!targetMessage) return state;
          let versions: (LocalMessage | string)[] = [];
          let prefix: string[] = [];
          let newVersionId: string;
          if (targetMessage.parentId === null) {
            versions = Object.values(chat.messages)
              .filter((msg) => msg.parentId === null)
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            if (newVersionIndex < 0 || newVersionIndex >= versions.length)
              return state;
            newVersionId = (versions[newVersionIndex] as LocalMessage).id;
            prefix = [];
          } else {
            const parent = chat.messages[targetMessage.parentId];
            if (!parent || !parent.childrenIds) return state;
            versions = parent.childrenIds;
            if (newVersionIndex < 0 || newVersionIndex >= versions.length)
              return state;
            newVersionId = versions[newVersionIndex] as string;
            const parentIndex = chat.activeBranch.indexOf(parent.id);
            prefix =
              parentIndex !== -1
                ? chat.activeBranch.slice(0, parentIndex + 1)
                : [];
          }
          const newActiveBranch = [
            ...prefix,
            ...buildBranchFrom(chat, newVersionId),
          ];
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, activeBranch: newActiveBranch },
            },
          };
        }),
      updateChatMetadata: (chatId, metadata) =>
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;
          return {
            chats: {
              ...state.chats,
              [chatId]: { ...chat, ...metadata },
            },
          };
        }),
      deleteChat: (chatId) =>
        set((state) => {
          const chats = { ...state.chats };
          delete chats[chatId];
          return { chats };
        }),
      resetChatStore: () => set({ chats: {}, currentChatId: undefined }),
    }),
    {
      name: "chat-store", // key in localStorage
      // Only persist currentChatId
      partialize: (state) => ({
        currentChatId: state.currentChatId,
      }),
    },
  ),
);
