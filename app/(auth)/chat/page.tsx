"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import ChatBox from "@/components/ChatBox";
import InputRow, { InputRowHandle } from "@/components/InputRow";
import ChatList from "@/components/ChatList";
import Header from "@/components/Header";
import AngleDownIcon from "@/components/Icon/AngleDown";
import { useChatStore } from "@/store/chatStore";
import {
  retrieveChatsLocalDb,
  retrieveMessagesLocalDb,
  createChatLocalDb,
  createMessageLocalDb,
  updateChatLocalDb,
  updateMessageLocalDb,
  LocalMessage,
  markChatAsDeletedLocalDb,
} from "@/utils/db/localDb";
import { generateChatTitle } from "@/utils/apiHelpers";
import { parseSSEChunk } from "@/utils/apiHelpers";
import { logger } from "@/utils/logger";
import { twoWaySync } from "@/utils/db/localDb";

export interface ChatItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatPage() {
  const {
    chats,
    currentChatId,
    createChat,
    setCurrentChatId,
    addMessage,
    updateMessage,
    changeBranch,
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
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [chats]);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showChatsPanel, setShowChatsPanel] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<InputRowHandle>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat messages from IndexedDB and update the store for the current chat.
  const loadMessages = useCallback(
    async (chatId: string) => {
      if (!chatId) return;

      setIsLoading(true);
      try {
        const chats = useChatStore.getState().chats;
        if (!chats[chatId]) return;
        const data = await retrieveMessagesLocalDb(chatId);
        if (data && data.length > 0) {
          // Clear the current chats messages in your store as needed.
          data.forEach((msg: LocalMessage) => {
            addMessage(chatId, msg);
          });
          if (!chats[chatId].activeBranch.length) {
            setActiveBranch(chatId);
          }
        }
      } catch (error) {
        logger.error("Error loading chat:", error);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [addMessage, setActiveBranch],
  );

  // Fetch chats from IndexedDB.
  const fetchChats = useCallback(async () => {
    const result = await retrieveChatsLocalDb();
    if (result && result.length > 0) {
      result.forEach((chat) => {
        const { id, title, createdAt, updatedAt, activeBranch } = chat;
        const currentChats = useChatStore.getState().chats;
        if (!currentChats[id]) {
          createChat(id, title, createdAt, updatedAt);
        }
        if (activeBranch && activeBranch.length > 0) {
          setActiveBranch(id, activeBranch);
        }
      });
    }
  }, [createChat, setActiveBranch]);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      await fetchChats();
      const chats = useChatStore.getState().chats;
      if (isMounted && currentChatId && chats[currentChatId]) {
        loadMessages(currentChatId);
      }
    };
    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [fetchChats, currentChatId, loadMessages]);

  // Scroll to the bottom when chat is loaded or messages are updated.
  useEffect(() => {
    if (
      currentChatId &&
      chatContainerRef.current &&
      shouldAutoScrollRef.current &&
      !isStreaming &&
      !isLoading
    ) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  }, [currentChatId, isStreaming, isLoading]);

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
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [currentChatId, updateMessage],
  );

  // Submit handler: create messages, persist them, stream response, then sync.
  const handleSubmit = useCallback(async () => {
    if (!currentChatId) return;
    const userInput = inputRef.current?.getValue();
    if (!userInput?.trim() || isLoading) return;
    inputRef.current?.clear();
    shouldAutoScrollRef.current = true;

    // Determine parent
    let parentId: string | null = null;
    const chat = useChatStore.getState().chats[currentChatId];
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
      chatId: currentChatId,
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
      chatId: currentChatId,
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
        addMessage(currentChatId, updatedParent);
      }
    }

    // Update state.
    addMessage(currentChatId, userMessage);
    addMessage(currentChatId, assistantMessage);
    editBranch(currentChatId, parentId, userMessageId);

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
      updateChatLocalDb(currentChatId, {
        title,
        updatedAt: now,
        activeBranch: chats[currentChatId].activeBranch,
      });
      updateChatMetadata(currentChatId, { title, updatedAt: now });
    } else {
      updateChatLocalDb(currentChatId, {
        updatedAt: now,
        activeBranch: chats[currentChatId].activeBranch,
      });
      updateChatMetadata(currentChatId, { updatedAt: now });
    }
  }, [
    currentChatId,
    isLoading,
    addMessage,
    editBranch,
    streamResponse,
    updateChatMetadata,
  ]);

  // Edit message handler: similar changes with immediate sync.
  const handleEditMessage = useCallback(
    async (editedMessage: LocalMessage) => {
      if (!currentChatId) return;
      const parentId = editedMessage.parentId;
      let history: LocalMessage[] = [];
      const chat = useChatStore.getState().chats[currentChatId];
      if (parentId && chat) {
        const parentIndex = chat.activeBranch.indexOf(parentId);
        if (parentIndex !== -1) {
          history = chat.activeBranch
            .slice(0, parentIndex + 1)
            .map((id) => chat.messages[id])
            .filter(Boolean) as LocalMessage[];
        }
      }

      // Create new messages.
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      const now = new Date();
      const userMessage: LocalMessage = {
        id: userMessageId,
        chatId: currentChatId,
        content: editedMessage.content,
        role: "user",
        parentId: editedMessage.parentId,
        childrenIds: [assistantMessageId],
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      const assistantMessage: LocalMessage = {
        id: assistantMessageId,
        chatId: currentChatId,
        content: "",
        role: "assistant",
        parentId: userMessageId,
        childrenIds: [],
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      createMessageLocalDb([userMessage, assistantMessage]);

      if (parentId) {
        const parent = chat?.messages[parentId];
        if (parent) {
          const updatedChildren = parent.childrenIds
            ? [...parent.childrenIds, userMessage.id]
            : [userMessage.id];
          updateMessageLocalDb(parentId, { childrenIds: updatedChildren });
          const updatedParent = { ...parent, childrenIds: updatedChildren };
          addMessage(currentChatId, updatedParent);
        }
      }

      addMessage(currentChatId, userMessage);
      addMessage(currentChatId, assistantMessage);
      editBranch(currentChatId, parentId, userMessageId);

      await streamResponse(userMessage, assistantMessage, history);

      // Update chat title and timestamp.
      const chats = useChatStore.getState().chats;
      if (!chat.activeBranch.length) {
        const title = await generateChatTitle(userMessage);
        updateChatLocalDb(currentChatId, {
          title,
          updatedAt: now,
          activeBranch: chats[currentChatId].activeBranch,
        });
        updateChatMetadata(currentChatId, { title, updatedAt: now });
      } else {
        updateChatLocalDb(currentChatId, {
          updatedAt: now,
          activeBranch: chats[currentChatId].activeBranch,
        });
        updateChatMetadata(currentChatId, { updatedAt: now });
      }
    },
    [currentChatId, addMessage, editBranch, streamResponse, updateChatMetadata],
  );

  // Sync effect: runs on mount, focus, online, and every 30 seconds.
  useEffect(() => {
    const handleSync = async () => {
      await twoWaySync();
      fetchChats();
      if (currentChatId) {
        loadMessages(currentChatId);
      }
    };

    handleSync();
    window.addEventListener("focus", handleSync);
    window.addEventListener("online", handleSync);
    const syncInterval = setInterval(twoWaySync, 30000);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("online", handleSync);
    };
  }, [currentChatId, loadMessages, fetchChats]);

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
            }
          }}
          deleteAction={async (chatId: string) => {
            deleteChat(chatId);
            markChatAsDeletedLocalDb(chatId);
            setCurrentChatId(undefined);
          }}
          renameAction={async (chatId: string, title: string) => {
            updateChatLocalDb(chatId, { title });
            updateChatMetadata(chatId, { title });
          }}
        />
      </div>
      <div className="col-start-2 row-start-2 row-span-2 h-full w-full flex flex-col overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex flex-grow overflow-y-auto overflow-x-hidden chat-container"
        >
          <div className="mx-auto w-full max-w-[1000px] px-5">
            <ChatBox
              isChatLoaded={!!currentChatId}
              onMessageEdit={(msg) => handleEditMessage(msg)}
              onBranchChange={(messageId: string, versionIndex: number) => {
                if (!currentChatId) return;
                changeBranch(currentChatId!, messageId, versionIndex);
                updateChatLocalDb(currentChatId, {
                  activeBranch:
                    useChatStore.getState().chats[currentChatId!].activeBranch,
                });
              }}
            />
          </div>
        </div>
        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="absolute bottom-[calc(50px+var(--input-row-height))] right-8 flex items-center justify-center bg-(--color-bg2) hover:bg-(--color-bg1) text-white rounded-full p-2 shadow-lg z-10 cursor-pointer w-10 h-10"
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
            isLoading={isLoading}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
