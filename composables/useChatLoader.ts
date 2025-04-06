import {
  dbRetrieveChat,
  dbRetrieveChats,
  dbRetrieveMessages,
} from "~/utils/db/local";

export function useChatLoader() {
  const chatStore = useChatStore();
  const initialLoad = ref(true);

  async function loadAllChats() {
    // Check if the app is running in the client
    if (import.meta.server) return;

    const allChats = await dbRetrieveChats();
    if (allChats.length) {
      allChats.forEach((chat) => {
        if (!chat.deleted) {
          chatStore.createChat(
            chat.id,
            chat.title,
            chat.createdAt,
            chat.updatedAt,
            chat.activeBranch,
            chat.pinned,
          );
        }
      });
    }
  }

  async function loadChat(chatId: string) {
    // Check if the app is running in the client
    if (import.meta.server) return;

    const chat = await dbRetrieveChat(chatId);
    if (!chat) {
      return false;
    }

    chatStore.createChat(
      chatId,
      chat.title,
      chat.createdAt,
      chat.updatedAt,
      chat.activeBranch,
      chat.pinned,
    );

    return true;
  }

  async function loadChatMessages(chatId: string) {
    // Check if the app is running in the client
    if (import.meta.server) return;

    // Load messages only if the chat is not empty
    if (!chatStore.chats[chatId].messages.length) {
      const messages = await dbRetrieveMessages(chatId);
      for (const message of messages) {
        chatStore.addMessage(chatId, message);
      }
    }
  }

  return {
    initialLoad,
    loadAllChats,
    loadChat,
    loadChatMessages,
  };
}
