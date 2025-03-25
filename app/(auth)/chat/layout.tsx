"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import InputRow, { InputRowHandle } from "@/components/InputRow";
import ChatList from "@/components/ChatList";
import Header from "@/components/Header";
import AngleDownIcon from "@/components/Icon/AngleDown";
import { useChatStore } from "@/store/chatStore";
import { useSyncStore } from "@/store/syncStore";
import {
  dbRetrieveChats,
  dbUpdateChat,
  dbMarkChatDeleted,
} from "@/utils/db/local";
import { handleSubmitMessage, preloadChats } from "@/utils/chat";
import { useRouter } from "next/navigation";
import { logger } from "@/utils/logger";
import { LocalMessage, LocalChat } from "@/types/db";

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
    setActiveBranch,
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

  const [showChatsPanel, setShowChatsPanel] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const inputRef = useRef<InputRowHandle>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Fetch chats from db
  const fetchChats = useCallback(async () => {
    const result = await dbRetrieveChats();
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

      // Preload messages for select chats
      preloadChats(result);
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
      shouldAutoScrollRef.current
    ) {
      // use setTimeout to ensure the scroll is done after the render
      setTimeout(() => {
        if (chatContainerRef.current) {
          logger.debug("Scrolling to the bottom");
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "instant",
          });
        }
      }, 0);
    }
  }, [currentChatId, chats]);

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
          createChat={() => {
            router.push("/chat", { scroll: false });
          }}
        />
      </div>
      <div className="col-start-1 row-start-1 row-span-3">
        <ChatList
          chats={chatList}
          currentChatId={currentChatId}
          setCurrentChatIdAction={(id: string) => {
            if (currentChatId === id) return;
            setCurrentChatId(id);
            router.push(`/chat/${id}`, { scroll: false });
          }}
          isVisible={showChatsPanel}
          setIsVisibleAction={setShowChatsPanel}
          createAction={() => {
            router.push("/chat", { scroll: false });
          }}
          deleteAction={async (chatId: string) => {
            deleteChat(chatId);
            dbMarkChatDeleted(chatId);
            if (chatId === currentChatId) {
              router.push("/chat", { scroll: false });
            }
          }}
          renameAction={async (chatId: string, title: string) => {
            dbUpdateChat(chatId, { title });
            updateChatMetadata(chatId, { title });
          }}
          pinAction={async (chatId: string, state: boolean) => {
            dbUpdateChat(chatId, { pinned: !state });
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
            submitHandler={() => {
              inputRef.current?.clear();
              shouldAutoScrollRef.current = true;
              if (inputRef.current?.getValue()) {
                handleSubmitMessage(inputRef.current.getValue(), router);
              }
            }}
            stopHandler={() => {
              const chatStore = useChatStore.getState();
              if (
                currentChatId &&
                chatStore.chats[currentChatId]?.abortController !== undefined
              ) {
                chatStore.chats[currentChatId]?.abortController.abort();
                chatStore.chats[currentChatId].abortController = undefined;
              }
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
