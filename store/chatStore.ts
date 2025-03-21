import { create } from "zustand";
import { LocalMessage } from "@/utils/db/localDb";

/**
 * ChatsState: State for a chat session.
 * Maintains messages and active branch.
 */
export interface ChatsState {
  messages: Record<string, LocalMessage>;
  activeBranch: string[]; // the branch of messages currently displayed
  isStreaming: boolean;
  abortController?: AbortController;
}

/**
 * ChatStore: Zustand store for chat sessions.
 * Maintains chat sessions, messages, and active branches.
 */
export interface ChatStore {
  chats: Record<string, ChatsState>;
  currentChatId?: string;
  // Actions
  setCurrentChat: (chatId: string | undefined) => void;
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
  rebuildBranch: (chatId: string) => void;
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
  deleteChat: (chatId: string) => void;
}

/**
 * Generate the active branch from scratch.
 * We assume that the “root” messages are those with no parent.
 * We sort roots by createdAt, pick the first root, then follow the first-child
 * chain (using each message’s childrenIds) until no more children exist.
 * @param messages - Record of messages
 * @returns Array of message IDs in the active branch
 */
function generateActiveBranch(
  messages: Record<string, LocalMessage>,
): string[] {
  const allMessages = Object.values(messages);
  // Get root messages (no parent) sorted by createdAt.
  const roots = allMessages
    .filter((msg) => msg.parentId === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (roots.length === 0) return [];
  const branch: string[] = [];
  let current = roots[0];
  branch.push(current.id);
  // Follow the first child chain as long as childrenIds is available and nonempty.
  while (current.childrenIds && current.childrenIds.length > 0) {
    const firstChildId = current.childrenIds[0];
    branch.push(firstChildId);
    current = messages[firstChildId];
    if (!current) break;
  }
  return branch;
}

/**
 * Build a branch starting from a message and following the first-child chain.
 * @param session - Chat session state
 * @param startId - Starting message ID
 * @returns Array of message IDs in the branch
 */
function buildBranchFrom(session: ChatsState, startId: string): string[] {
  const branch: string[] = [];
  branch.push(startId);
  let current = session.messages[startId];
  while (current && current.childrenIds && current.childrenIds.length > 0) {
    const firstChildId = current.childrenIds[0];
    branch.push(firstChildId);
    current = session.messages[firstChildId];
  }
  return branch;
}

/**
 * ChatStore: Zustand store for chat sessions.
 * Maintains chat sessions, messages, and active branches.
 */
export const useChatStore = create<ChatStore>((set) => ({
  chats: {},
  currentChatId: undefined,
  setCurrentChat: (chatId) =>
    set((state) => {
      if (chatId === undefined) return { currentChatId: undefined };
      return {
        currentChatId: chatId,
        chats: {
          ...state.chats,
          [chatId]: state.chats[chatId] || {
            messages: {},
            activeBranch: [],
            isStreaming: false,
          },
        },
      };
    }),
  updateChatMessages: (sessionId, messages) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [sessionId]: {
          ...state.chats[sessionId],
          messages,
        },
      },
    })),
  setChatStreaming: (sessionId, isStreaming) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [sessionId]: {
          ...state.chats[sessionId],
          isStreaming,
        },
      },
    })),
  setChatAbortController: (sessionId, controller) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [sessionId]: {
          ...state.chats[sessionId],
          abortController: controller,
        },
      },
    })),
  addMessage: (sessionId, message) =>
    set((state) => {
      const session = state.chats[sessionId];
      const newMessages = { ...session.messages, [message.id]: message };
      return {
        chats: {
          ...state.chats,
          [sessionId]: { ...session, messages: newMessages },
        },
      };
    }),
  updateMessage: (sessionId, id, content) =>
    set((state) => {
      const session = state.chats[sessionId];
      const updatedMessages = {
        ...session.messages,
        [id]: { ...session.messages[id], content },
      };
      return {
        chats: {
          ...state.chats,
          [sessionId]: { ...session, messages: updatedMessages },
        },
      };
    }),
  // Build the active branch from scratch.
  rebuildBranch: (sessionId) =>
    set((state) => {
      const session = state.chats[sessionId];
      const newActiveBranch = generateActiveBranch(session.messages);
      return {
        chats: {
          ...state.chats,
          [sessionId]: { ...session, activeBranch: newActiveBranch },
        },
      };
    }),
  // Edit a branch by setting the active branch to the branch from the new user message.
  editBranch: (
    sessionId: string,
    parentId: string | null,
    newUserMessageId: string,
  ) =>
    set((state) => {
      const session = state.chats[sessionId];
      if (!session) return state;
      let newActiveBranch: string[];
      // If there is no parent (i.e. editing a root message), then the new branch is just the branch from the new message.
      if (!parentId) {
        newActiveBranch = buildBranchFrom(session, newUserMessageId);
      } else {
        // Otherwise, get the prefix (branch up to and including the parent).
        const parentIndex = session.activeBranch.indexOf(parentId);
        const prefix =
          parentIndex !== -1
            ? session.activeBranch.slice(0, parentIndex + 1)
            : [];
        // Build the new branch from the new user message.
        const newSegment = buildBranchFrom(session, newUserMessageId);
        newActiveBranch = [...prefix, ...newSegment];
      }
      return {
        chats: {
          ...state.chats,
          [sessionId]: {
            ...session,
            activeBranch: newActiveBranch,
          },
        },
      };
    }),
  changeBranch: (
    sessionId: string,
    messageId: string,
    newVersionIndex: number,
  ) =>
    set((state) => {
      const session = state.chats[sessionId];
      if (!session) return state;
      const targetMessage = session.messages[messageId];
      if (!targetMessage) return state;

      let versions: (LocalMessage | string)[] = [];
      let prefix: string[] = [];
      let newVersionId: string;

      // If target is a root message
      if (targetMessage.parentId === null) {
        // Get all root messages, sorted by creation time.
        versions = Object.values(session.messages)
          .filter((msg) => msg.parentId === null)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        if (newVersionIndex < 0 || newVersionIndex >= versions.length)
          return state;
        newVersionId = (versions[newVersionIndex] as LocalMessage).id;
        // For a root, there is no prefix.
        prefix = [];
      } else {
        // Otherwise, get parent's childrenIds (which are strings).
        const parent = session.messages[targetMessage.parentId];
        if (!parent || !parent.childrenIds) return state;
        versions = parent.childrenIds; // array of string IDs
        if (newVersionIndex < 0 || newVersionIndex >= versions.length)
          return state;
        newVersionId = versions[newVersionIndex] as string;
        // Compute prefix: the branch up to and including the parent.
        const parentIndex = session.activeBranch.indexOf(parent.id);
        prefix =
          parentIndex !== -1
            ? session.activeBranch.slice(0, parentIndex + 1)
            : [];
      }

      // Build the new active branch by concatenating the prefix with the branch from the newVersionId.
      const newActiveBranch = [
        ...prefix,
        ...buildBranchFrom(session, newVersionId),
      ];

      return {
        chats: {
          ...state.chats,
          [sessionId]: {
            ...session,
            activeBranch: newActiveBranch,
          },
        },
      };
    }),
  deleteChat: (sessionId) =>
    set((state) => {
      const sessions = { ...state.chats };
      delete sessions[sessionId];
      return { chats: sessions };
    }),
}));
