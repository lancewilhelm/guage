"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatBox from "@/components/ChatBox";
import InputRow, { InputRowHandle } from "@/components/InputRow";
import ChatList from "@/components/ChatList";
import Header from "@/components/Header";
import AngleDownIcon from "@/components/Icon/AngleDown";
import { useChatStore } from "@/store/chatStore";
import {
  retrieveChatsLocalDB,
  retrieveMessagesLocalDB,
  createChatLocalDB,
  insertMessageLocalDb,
  updateChatLocalDB,
  updateMessageLocalDB,
  LocalChat,
  LocalMessage,
  deleteChatLocalDB,
} from "@/utils/db/localDb";
import { generateSessionTitle } from "@/utils/apiHelpers";
import { parseSSEChunk } from "@/utils/apiHelpers";
import { logger } from "@/utils/logger";

export default function ChatPage() {
  // Extract actions and current session id from the store.
  const {
    currentChatId,
    setCurrentChat,
    addMessage,
    updateMessage,
    changeBranch,
    rebuildBranch,
    editBranch,
    deleteChat,
  } = useChatStore();

  const [chats, setChats] = useState<Array<LocalChat>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<InputRowHandle>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat messages from IndexedDB and update the store for the current session.
  const loadChat = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      try {
        const data = await retrieveMessagesLocalDB(sessionId);
        if (data) {
          // Clear the current session messages in your store as needed.
          data.forEach((msg: LocalMessage) => {
            addMessage(sessionId, msg);
          });
          rebuildBranch(sessionId);
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
    [addMessage, rebuildBranch],
  );

  // Fetch chat sessions from IndexedDB.
  const fetchChats = useCallback(async () => {
    const result = await retrieveChatsLocalDB();
    if (result && result.length > 0) {
      setChats(result);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // When the current session changes, load its messages.
  useEffect(() => {
    if (currentChatId) {
      loadChat(currentChatId);
    }
  }, [currentChatId, loadChat]);

  // Scroll to the bottom when chat is loaded or messsages are updated.
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

  // Detect manual scrolling
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    const handleScroll = () => {
      if (!chatContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

      // Update the ref immediately for use during streaming
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

  // Streaming response logic. As chunks arrive, we update the assistant's message in the store.
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
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: history ? history : [],
            userMessage,
            sessionId: currentChatId,
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
              updateMessageLocalDB(assistantMessage.id, {
                content: accumulatedResponse,
              });

              // Scroll to bottom during streaming
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

  // Submit handler: create new user and assistant messages, persist them, and stream the response.
  const handleSubmit = useCallback(async () => {
    if (!currentChatId) return;
    const userInput = inputRef.current?.getValue();
    if (!userInput?.trim() || isLoading) return;
    inputRef.current?.clear();

    // Reset shouldAutoScroll to true when a new message is sent
    shouldAutoScrollRef.current = true;

    // Determine parent and depth for the new messages.
    let parentId: string | null = null;
    let depth = 0;
    const session = useChatStore.getState().chats[currentChatId];
    if (session && session.activeBranch.length > 0) {
      const lastMessageId =
        session.activeBranch[session.activeBranch.length - 1];
      const lastMessage = session.messages[lastMessageId];
      if (lastMessage && lastMessage.role === "assistant") {
        parentId = lastMessage.id;
        depth = lastMessage.depth + 1;
      }
    }

    // Create new messages.
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();
    const now = new Date();
    const userMessage: LocalMessage = {
      id: userMessageId,
      sessionId: currentChatId,
      content: userInput,
      role: "user",
      parentId,
      childrenIds: [assistantMessageId],
      depth,
      createdAt: now,
      updatedAt: now,
      synced: false,
    };
    const assistantMessage: LocalMessage = {
      id: assistantMessageId,
      sessionId: currentChatId,
      content: "",
      role: "assistant",
      parentId: userMessageId,
      childrenIds: [],
      depth: depth + 1,
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    // Persist new messages to IndexedDB.
    insertMessageLocalDb([userMessage, assistantMessage]);

    // If there is a parent, update its childrenIds.
    if (parentId) {
      const parent = session?.messages[parentId];
      if (parent) {
        const updatedChildren = parent.childrenIds
          ? [...parent.childrenIds, userMessage.id]
          : [userMessage.id];
        updateMessageLocalDB(parentId, { childrenIds: updatedChildren });
        const updatedParent = { ...parent, childrenIds: updatedChildren };
        addMessage(currentChatId, updatedParent);
      }
    }

    // Create history for the stream response.
    const history = session.activeBranch
      .map((id) => session.messages[id])
      .filter(Boolean) as LocalMessage[];

    // Update Zustand store (add messages and update activeBranch).
    addMessage(currentChatId, userMessage);
    addMessage(currentChatId, assistantMessage);
    editBranch(currentChatId, parentId, userMessageId);

    // Stream the response.
    streamResponse(userMessage, assistantMessage, history);

    // Update the chat title if this is the first message in the session
    if (!history || history.length === 0) {
      const title = await generateSessionTitle(userMessage);
      updateChatLocalDB(currentChatId, { title });
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, title } : chat,
        ),
      );
    }

    // Update the chat updatedAt timestamp
    updateChatLocalDB(currentChatId, { updatedAt: now });
    setChats((prev) =>
      prev
        .map((chat) =>
          chat.id === currentChatId ? { ...chat, updatedAt: now } : chat,
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    );
  }, [currentChatId, isLoading, addMessage, editBranch, streamResponse]);

  // Edit an existing message by creating a new branch from its parent.
  const handleEditMessage = useCallback(
    async (editedMessage: LocalMessage) => {
      if (!currentChatId) return;
      const parentId = editedMessage.parentId;
      let history: LocalMessage[] = [];
      const session = useChatStore.getState().chats[currentChatId];
      if (parentId && session) {
        const parentIndex = session.activeBranch.indexOf(parentId);
        if (parentIndex !== -1) {
          history = session.activeBranch
            .slice(0, parentIndex + 1)
            .map((id) => session.messages[id])
            .filter(Boolean) as LocalMessage[];
        }
      }

      // Create new messages.
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      const now = new Date();
      const userMessage: LocalMessage = {
        id: userMessageId,
        sessionId: currentChatId,
        content: editedMessage.content,
        role: "user",
        parentId: editedMessage.parentId,
        childrenIds: [assistantMessageId],
        depth: editedMessage.depth,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      const assistantMessage: LocalMessage = {
        id: assistantMessageId,
        sessionId: currentChatId,
        content: "",
        role: "assistant",
        parentId: userMessageId,
        childrenIds: [],
        depth: editedMessage.depth + 1,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      // Persist new messages to IndexedDB.
      insertMessageLocalDb([userMessage, assistantMessage]);

      // If there is a parent, update its childrenIds.
      if (parentId) {
        const parent = session?.messages[parentId];
        if (parent) {
          const updatedChildren = parent.childrenIds
            ? [...parent.childrenIds, userMessage.id]
            : [userMessage.id];
          updateMessageLocalDB(parentId, { childrenIds: updatedChildren });
          const updatedParent = { ...parent, childrenIds: updatedChildren };
          addMessage(currentChatId, updatedParent);
        }
      }

      // Update Zustand store (add messages and update activeBranch).
      addMessage(currentChatId, userMessage);
      addMessage(currentChatId, assistantMessage);
      editBranch(currentChatId, parentId, userMessageId);

      // Stream the response.
      await streamResponse(userMessage, assistantMessage, history);

      // Update the chat title if this is the first message in the session
      if (!history || history.length === 0) {
        const title = await generateSessionTitle(userMessage);
        updateChatLocalDB(currentChatId, { title });
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId ? { ...chat, title } : chat,
          ),
        );
      }

      // Update the chat updatedAt timestamp
      updateChatLocalDB(currentChatId, { updatedAt: now });
      setChats((prev) =>
        prev
          .map((chat) =>
            chat.id === currentChatId ? { ...chat, updatedAt: now } : chat,
          )
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      );
    },
    [currentChatId, addMessage, editBranch, streamResponse],
  );

  return (
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className="col-start-2">
        <Header
          isSessionButtonVisible={!showSessionPanel}
          toggleSessionPanel={() => setShowSessionPanel(!showSessionPanel)}
          createChatSession={async () => {
            const newChat = await createChatLocalDB();
            if (newChat) {
              // Set current session in the store.
              setCurrentChat(newChat.id);
              setChats((prev) => [newChat, ...prev]);
            }
          }}
        />
      </div>

      <div className="col-start-1 row-start-1 row-span-3">
        <ChatList
          chats={chats}
          currentChatId={currentChatId}
          setCurrentChatIdAction={(id: string) => {
            setCurrentChat(id);
          }}
          isVisible={showSessionPanel}
          setIsVisibleAction={setShowSessionPanel}
          createAction={async () => {
            const newChat = await createChatLocalDB();
            if (newChat) {
              setCurrentChat(newChat.id);
              setChats((prev) => [newChat, ...prev]);
            }
          }}
          deleteAction={async (chatId: string) => {
            deleteChat(chatId);
            deleteChatLocalDB(chatId);
            setChats((prev) => prev.filter((chat) => chat.id !== chatId));
            setCurrentChat(undefined);
          }}
          renameAction={async (chatId: string, title: string) => {
            const chat = chats.find((c) => c.id === chatId);
            if (chat) {
              const updatedChat = { ...chat, title };
              updateChatLocalDB(chatId, { title });
              setChats((prev) =>
                prev.map((c) => (c.id === chatId ? updatedChat : c)),
              );
            }
          }}
        />
      </div>

      <div className="col-start-2 row-start-2 row-span-2 h-full w-full flex flex-col overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex flex-grow overflow-y-auto chat-container"
        >
          <div className="mx-auto w-full max-w-[1000px] px-5">
            <ChatBox
              isSessionLoaded={!!currentChatId}
              onMessageEdit={(msg) => {
                handleEditMessage(msg);
              }}
              onBranchChange={(messageId: string, versionIndex: number) =>
                changeBranch(currentChatId!, messageId, versionIndex)
              }
            />
          </div>
        </div>

        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="fixed bottom-28 right-8 flex items-center justify-center bg-(--color-bg2) hover:bg-(--color-bg1) text-white rounded-full p-2 shadow-lg z-10 cursor-pointer w-10 h-10"
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
