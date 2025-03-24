"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import InputRow, { InputRowHandle } from "@/components/InputRow";
import ChatList from "@/components/ChatList";
import Header from "@/components/Header";
import AngleDownIcon from "@/components/Icon/AngleDown";
import { useChatStore } from "@/store/chatStore";
import { useSyncStore } from "@/store/syncStore";
import {
  retrieveChatsLocalDb,
  createChatLocalDb,
  createMessageLocalDb,
  updateChatLocalDb,
  updateMessageLocalDb,
  LocalMessage,
  LocalChat,
  markChatAsDeletedLocalDb,
} from "@/utils/db/localDb";
import { generateChatTitle } from "@/utils/apiHelpers";
import { parseSSEChunk } from "@/utils/apiHelpers";
import { logger } from "@/utils/logger";
import { useRouter } from "next/navigation";

export interface ChatItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
  isStreaming: boolean;
}

export default function ChatPage({ children }: { children: React.ReactNode }) {
  const {
    chats,
    currentChatId,
    createChat,
    setCurrentChatId,
    addMessage,
    updateMessage,
    setActiveBranch,
    editBranch,
    updateChatMetadata,
    deleteChat,
  } = useChatStore();

  // Create a list of chats for the ChatList component.
  const chatList = useMemo(() => {
    return Object.entries(chats)
      .map(([id, chat]) => ({
        id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        pinned: chat.pinned,
        isStreaming: chat.isStreaming,
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [chats]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [showChatsPanel, setShowChatsPanel] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<InputRowHandle>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Fetch chats from IndexedDB.
  const fetchChats = useCallback(async () => {
    const result = await retrieveChatsLocalDb();
    if (result && result.length > 0) {
      result.forEach((chat) => {
        const { id, title, createdAt, updatedAt, activeBranch, pinned } = chat;
        const currentChats = useChatStore.getState().chats;
        if (!currentChats[id]) {
          createChat(id, title, createdAt, updatedAt, activeBranch, pinned);
        }
        if (activeBranch && activeBranch.length > 0) {
          setActiveBranch(id, activeBranch);
        }
      });
    }
  }, [createChat, setActiveBranch]);

  useEffect(() => {
    const initializeApp = async () => {
      await fetchChats();
    };
    initializeApp();

    const handleFocusInput = () => {
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    handleFocusInput();

    window.addEventListener("focus", handleFocusInput);

    return () => {
      window.removeEventListener("focus", handleFocusInput);
    };
  }, [fetchChats, currentChatId]);

  // Scroll to the bottom when chat is loaded or messages are updated.
  useEffect(() => {
    if (
      currentChatId &&
      chatContainerRef.current &&
      shouldAutoScrollRef.current &&
      !isStreaming
    ) {
      // use setTimeout to ensure the scroll is done after the render
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "instant",
          });
        }
      }, 0);
    }
  }, [currentChatId, isStreaming, chats]);

  // Detect manual scrolling.
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    const handleScroll = () => {
      if (!chatContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldAutoScrollRef.current = isScrolledToBottom;
      setShowScrollToBottom(!isScrolledToBottom);
    };

    chatContainer?.addEventListener("scroll", handleScroll);
    return () => chatContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      shouldAutoScrollRef.current = true;
    }
  }, []);

  // Streaming response logic.
  const streamResponse = useCallback(
    async (
      userMessage: LocalMessage,
      assistantMessage: LocalMessage,
      history?: LocalMessage[],
    ) => {
      if (!currentChatId) return;
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();
      let accumulatedResponse = "";
      try {
        const response = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: history ? history : [],
            userMessage,
            chatId: currentChatId,
          }),
          signal: abortControllerRef.current.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error("Failed to fetch chat response");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunks = parseSSEChunk(decoder.decode(value));
          for (const chunk of chunks) {
            if (chunk.eventType === "messageChunk") {
              accumulatedResponse += JSON.parse(chunk.data);
              updateMessage(
                currentChatId,
                assistantMessage.id,
                accumulatedResponse,
              );
              updateMessageLocalDb(assistantMessage.id, {
                content: accumulatedResponse,
              });
              if (chatContainerRef.current && shouldAutoScrollRef.current) {
                chatContainerRef.current.scrollTo({
                  top: chatContainerRef.current.scrollHeight,
                  behavior: "instant",
                });
              }
            }
          }
        }
      } catch (error) {
        logger.error("Error during streaming:", error);
      } finally {
        updateChatMetadata(currentChatId, { isStreaming: false });
        abortControllerRef.current = null;
      }
    },
    [currentChatId, updateMessage, updateChatMetadata],
  );

  // Submit handler: create messages, persist them, stream response, then sync.
  const handleSubmit = useCallback(async () => {
    let chatIdToUse = currentChatId;
    if (!chatIdToUse) {
      const newChat = await createChatLocalDb();
      if (newChat) {
        createChat(
          newChat.id,
          newChat.title,
          newChat.createdAt,
          newChat.updatedAt,
        );
        setCurrentChatId(newChat.id);
        chatIdToUse = newChat.id;
        router.push(`/chat/${newChat.id}`);
      }
    }

    if (!chatIdToUse) return;

    updateChatMetadata(chatIdToUse, { isStreaming: true });

    const userInput = inputRef.current?.getValue();
    if (!userInput?.trim()) return;
    inputRef.current?.clear();
    shouldAutoScrollRef.current = true;

    // Determine parent
    let parentId: string | null = null;
    const chat = useChatStore.getState().chats[chatIdToUse];
    if (chat && chat.activeBranch.length > 0) {
      const lastMessageId = chat.activeBranch[chat.activeBranch.length - 1];
      const lastMessage = chat.messages[lastMessageId];
      if (lastMessage && lastMessage.role === "assistant") {
        parentId = lastMessage.id;
      }
    }

    // Create new messages.
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();
    const now = new Date();
    const userMessage: LocalMessage = {
      id: userMessageId,
      chatId: chatIdToUse,
      content: userInput,
      role: "user",
      parentId,
      childrenIds: [assistantMessageId],
      createdAt: now,
      updatedAt: now,
      synced: false,
    };
    const assistantMessage: LocalMessage = {
      id: assistantMessageId,
      chatId: chatIdToUse,
      content: "",
      role: "assistant",
      parentId: userMessageId,
      childrenIds: [],
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    // Persist messages to IndexedDB.
    createMessageLocalDb([userMessage, assistantMessage]);

    // Update parent's childrenIds if applicable.
    if (parentId) {
      const parent = chat?.messages[parentId];
      if (parent) {
        const updatedChildren = parent.childrenIds
          ? [...parent.childrenIds, userMessage.id]
          : [userMessage.id];
        updateMessageLocalDb(parentId, { childrenIds: updatedChildren });
        const updatedParent = { ...parent, childrenIds: updatedChildren };
        addMessage(chatIdToUse, updatedParent);
      }
    }

    // Update state.
    addMessage(chatIdToUse, userMessage);
    addMessage(chatIdToUse, assistantMessage);
    editBranch(chatIdToUse, parentId, userMessageId);

    // Start streaming response.
    streamResponse(
      userMessage,
      assistantMessage,
      chat.activeBranch
        .map((id) => chat.messages[id])
        .filter(Boolean) as LocalMessage[],
    );

    // Update chat title and timestamp.
    const chats = useChatStore.getState().chats;
    if (!chat.activeBranch.length) {
      const title = await generateChatTitle(userMessage);
      updateChatLocalDb(chatIdToUse, {
        title,
        updatedAt: now,
        activeBranch: chats[chatIdToUse].activeBranch,
      });
      updateChatMetadata(chatIdToUse, { title, updatedAt: now });
    } else {
      updateChatLocalDb(chatIdToUse, {
        updatedAt: now,
        activeBranch: chats[chatIdToUse].activeBranch,
      });
      updateChatMetadata(chatIdToUse, { updatedAt: now });
    }
  }, [
    currentChatId,
    addMessage,
    editBranch,
    streamResponse,
    updateChatMetadata,
    createChat,
    router,
    setCurrentChatId,
  ]);

  // Sync effect: runs on mount, focus, online, and every 30 seconds.
  useEffect(() => {
    // Get synchronization methods from the store state
    const syncState = useSyncStore.getState();

    // Trigger initial sync
    syncState.sync();

    // Set up periodic and event-based sync
    const handleSync = () => {
      useSyncStore.getState().sync();
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("online", handleSync);
    const syncInterval = setInterval(handleSync, 30000);

    // Listen for chat updates and update the chat store accordingly
    const handleChatsUpdated = (updatedChats: LocalChat[]) => {
      if (!updatedChats || updatedChats.length === 0) return;

      updatedChats.forEach((chat) => {
        const { id, title, createdAt, updatedAt, activeBranch, pinned } = chat;
        const currentChats = useChatStore.getState().chats;
        if (!currentChats[id]) {
          createChat(id, title, createdAt, updatedAt, activeBranch, pinned);
        } else {
          updateChatMetadata(id, { title, updatedAt, pinned });
          if (activeBranch && activeBranch.length > 0) {
            setActiveBranch(id, activeBranch);
          }
        }
      });

      // Refresh the chat list
      fetchChats();
    };

    // Listen for message updates and update the chat store accordingly
    const handleMessagesUpdated = (updatedMessages: LocalMessage[]) => {
      if (!updatedMessages || updatedMessages.length === 0) return;

      updatedMessages.forEach((message) => {
        if (message.chatId && useChatStore.getState().chats[message.chatId]) {
          addMessage(message.chatId, message);
        }
      });
    };

    // Subscribe to store update events
    const unsubscribe = useSyncStore.subscribe((state) => {
      // Check for chat updates
      if (state.updatedChats && state.updatedChats.length > 0) {
        handleChatsUpdated(state.updatedChats);
      }

      // Check for message updates
      if (state.updatedMessages && state.updatedMessages.length > 0) {
        handleMessagesUpdated(state.updatedMessages);
      }
    });

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("online", handleSync);
    };
  }, [
    currentChatId,
    createChat,
    updateChatMetadata,
    setActiveBranch,
    addMessage,
    fetchChats,
  ]);

  return (
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className="col-start-2">
        <Header
          isChatsButtonVisible={!showChatsPanel}
          toggleChatsPanel={() => setShowChatsPanel(!showChatsPanel)}
          createChat={async () => {
            const newChat = await createChatLocalDb();
            if (newChat) {
              setCurrentChatId(newChat.id);
              updateChatMetadata(newChat.id, {
                title: newChat.title,
                createdAt: newChat.createdAt,
                updatedAt: newChat.updatedAt,
              });
              router.push(`/chat/${newChat.id}`);
            }
          }}
        />
      </div>
      <div className="col-start-1 row-start-1 row-span-3">
        <ChatList
          chats={chatList}
          currentChatId={currentChatId}
          setCurrentChatIdAction={(id: string) => {
            setCurrentChatId(id);
            router.push(`/chat/${id}`);
          }}
          isVisible={showChatsPanel}
          setIsVisibleAction={setShowChatsPanel}
          createAction={async () => {
            const newChat = await createChatLocalDb();
            if (newChat) {
              createChat(
                newChat.id,
                newChat.title,
                newChat.createdAt,
                newChat.updatedAt,
              );
              setCurrentChatId(newChat.id);
              router.push(`/chat/${newChat.id}`);
            }
          }}
          deleteAction={async (chatId: string) => {
            deleteChat(chatId);
            markChatAsDeletedLocalDb(chatId);
            setCurrentChatId(undefined);
            router.push("/chat");
          }}
          renameAction={async (chatId: string, title: string) => {
            updateChatLocalDb(chatId, { title });
            updateChatMetadata(chatId, { title });
          }}
          pinAction={async (chatId: string, state: boolean) => {
            updateChatLocalDb(chatId, { pinned: !state });
            updateChatMetadata(chatId, { pinned: !state });
          }}
        />
      </div>
      <div className="col-start-2 row-start-2 row-span-2 h-full w-full flex flex-col overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex flex-grow overflow-y-auto overflow-x-hidden chat-container"
        >
          <div className="mx-auto w-full max-w-[1000px] px-5">{children}</div>
        </div>
        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="absolute bottom-[calc(35px+var(--input-row-height))] right-8 flex items-center justify-center bg-(--color-bg2) hover:bg-(--color-bg1) text-white rounded-full p-2 shadow-lg z-10 cursor-pointer w-10 h-10"
            aria-label="Scroll to bottom"
          >
            <AngleDownIcon fill="var(--color-fg0)" className="scale-125" />
          </button>
        )}
        <div className="mx-auto w-full max-w-[1000px]">
          <InputRow
            ref={inputRef}
            submitHandler={handleSubmit}
            stopHandler={() => {
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              abortControllerRef.current = null;
              setIsStreaming(false);
            }}
            isLoading={false}
            isStreaming={
              currentChatId !== undefined &&
              useChatStore.getState().chats[currentChatId]?.isStreaming
            }
          />
        </div>
      </div>
    </div>
  );
}
