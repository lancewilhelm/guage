import type { LocalChat, LocalMessage } from "~/utils/db/local";

export const useChatStore = defineStore("chat", () => {
  const chats = ref<Record<string, ChatState>>({});
  const currentChatId = ref<string | undefined>(undefined);

  function createChat(
    chatId: string,
    title = "New Chat",
    createdAt = new Date(),
    updatedAt = new Date(),
    activeBranch: string[] = [],
    pinned = false,
  ) {
    if (!chats.value[chatId]) {
      chats.value[chatId] = {
        id: chatId,
        messages: {},
        activeBranch,
        isStreaming: false,
        title,
        createdAt,
        updatedAt,
        pinned,
      };
    }
  }

  function setCurrentChatId(chatId?: string) {
    if (!chatId || !chats.value[chatId]) {
      currentChatId.value = undefined;
    } else {
      currentChatId.value = chatId;
    }
  }

  function updateChatMessages(
    chatId: string,
    messages: Record<string, LocalMessage>,
  ) {
    if (chats.value[chatId]) {
      chats.value[chatId].messages = messages;
    }
  }

  function setChatStreaming(chatId: string, isStreaming: boolean) {
    if (chats.value[chatId]) {
      chats.value[chatId].isStreaming = isStreaming;
    }
  }

  function setChatAbortController(
    chatId: string,
    controller?: AbortController,
  ) {
    const chat = chats.value[chatId];
    if (chat) {
      chat.abortController?.abort();
      chat.abortController = controller;
    }
  }

  function addMessage(chatId: string, message: LocalMessage) {
    if (chats.value[chatId]) {
      chats.value[chatId].messages[message.id] = message;
    }
  }

  function updateMessage(chatId: string, id: string, content: string) {
    const chat = chats.value[chatId];
    if (chat?.messages[id]) {
      chat.messages[id].content = content;
    }
  }

  function setActiveBranch(chatId: string, branch?: string[]) {
    const chat = chats.value[chatId];
    if (chat) {
      chat.activeBranch =
        branch ?? generateActiveBranchFromLatest(chat.messages);
    }
  }

  function editBranch(
    chatId: string,
    parentId: string | null,
    newUserMessageId: string,
  ) {
    const chat = chats.value[chatId];
    if (!chat) return;

    const newSegment = buildBranchFrom(chat, newUserMessageId);
    if (!parentId) {
      chat.activeBranch = newSegment;
    } else {
      const parentIndex = chat.activeBranch.indexOf(parentId);
      const prefix =
        parentIndex !== -1 ? chat.activeBranch.slice(0, parentIndex + 1) : [];
      chat.activeBranch = [...prefix, ...newSegment];
    }
  }

  function changeBranch(
    chatId: string,
    messageId: string,
    newVersionIndex: number,
  ) {
    const chat = chats.value[chatId];
    if (!chat) return;

    const target = chat.messages[messageId];
    if (!target) return;

    let newVersionId: string;
    let prefix: string[] = [];

    if (target.parentId === null) {
      const rootMessages = Object.values(chat.messages)
        .filter((msg) => msg.parentId === null)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      if (newVersionIndex >= rootMessages.length) return;
      newVersionId = rootMessages[newVersionIndex].id;
    } else {
      const parent = chat.messages[target.parentId];
      if (!parent?.childrenIds) return;
      if (newVersionIndex >= parent.childrenIds.length) return;
      newVersionId = parent.childrenIds[newVersionIndex];
      const parentIndex = chat.activeBranch.indexOf(parent.id);
      prefix =
        parentIndex !== -1 ? chat.activeBranch.slice(0, parentIndex + 1) : [];
    }

    chat.activeBranch = [...prefix, ...buildBranchFrom(chat, newVersionId)];
  }

  function updateChatMetadata(chatId: string, metadata: Partial<ChatState>) {
    const chat = chats.value[chatId];
    if (chat) {
      chats.value[chatId] = { ...chat, ...metadata };
    }
  }

  function deleteChat(chatId: string) {
    const { [chatId]: _, ...rest } = chats.value;
    chats.value = rest;
  }

  function resetChatStore() {
    chats.value = {};
    currentChatId.value = undefined;
  }

  function upsertChatFromSync(chat: LocalChat) {
    if (chat.deleted) {
      deleteChat(chat.id);
      return;
    }

    const existing = chats.value[chat.id];
    if (!existing) {
      createChat(
        chat.id,
        chat.title,
        new Date(chat.createdAt),
        new Date(chat.updatedAt),
        chat.activeBranch,
        chat.pinned,
      );
    } else if (new Date(chat.updatedAt) > existing.updatedAt) {
      updateChatMetadata(chat.id, {
        title: chat.title,
        updatedAt: new Date(chat.updatedAt),
        pinned: chat.pinned,
        activeBranch: chat.activeBranch,
      });
    }
  }

  function upsertMessageFromSync(chatId: string, message: LocalMessage) {
    const chat = chats.value[chatId];
    if (!chat) return;

    const existing = chat.messages[message.id];
    if (
      !existing ||
      new Date(message.updatedAt) > new Date(existing.updatedAt)
    ) {
      chat.messages[message.id] = message;
    }
  }

  return {
    chats,
    currentChatId,
    createChat,
    setCurrentChatId,
    updateChatMessages,
    setChatStreaming,
    setChatAbortController,
    addMessage,
    updateMessage,
    setActiveBranch,
    editBranch,
    changeBranch,
    updateChatMetadata,
    deleteChat,
    resetChatStore,
    upsertChatFromSync,
    upsertMessageFromSync,
  };
});

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

function buildBranchFrom(chat: ChatState, startId: string): string[] {
  const branch: string[] = [startId];
  let current = chat.messages[startId];
  while (current?.childrenIds?.length) {
    const nextId = current.childrenIds[0];
    branch.push(nextId);
    current = chat.messages[nextId];
  }
  return branch;
}

export interface ChatState {
  id: string;
  messages: Record<string, LocalMessage>;
  activeBranch: string[];
  isStreaming: boolean;
  abortController?: AbortController;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
}
