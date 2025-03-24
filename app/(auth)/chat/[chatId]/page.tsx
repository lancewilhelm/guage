"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatBox from "@/components/ChatBox";
import { useChatStore } from "@/store/chatStore";
import {
  createMessageLocalDb,
  updateChatLocalDb,
  updateMessageLocalDb,
  retrieveChatsLocalDb,
  retrieveMessagesLocalDb,
  LocalMessage,
} from "@/utils/db/localDb";
import { generateChatTitle } from "@/utils/apiHelpers";
import { parseSSEChunk } from "@/utils/apiHelpers";
import { logger } from "@/utils/logger";
import { useParams } from "next/navigation";
import BouncingDotsIcon from "@/components/Icon/BouncingDots";

export interface ChatItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
}

export default function Chat() {
  const params = useParams();
  const chatId = params.chatId as string;

  const {
    currentChatId,
    setCurrentChatId,
    addMessage,
    updateMessage,
    changeBranch,
    editBranch,
    updateChatMetadata,
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat messages from IndexedDB
  const loadMessages = useCallback(
    async (chatId: string) => {
      if (!chatId) return;

      try {
        const chats = useChatStore.getState().chats;
        if (!chats[chatId] || Object.keys(chats[chatId].messages).length)
          return;

        setIsLoading(true);
        const data = await retrieveMessagesLocalDb(chatId);
        if (data && data.length > 0) {
          // Add messages to the store
          data.forEach((msg: LocalMessage) => {
            addMessage(chatId, msg);
          });

          // Set active branch if none exists
          if (!chats[chatId].activeBranch.length) {
            useChatStore.getState().setActiveBranch(chatId);
          }
        }
      } catch (error) {
        console.error("Error loading chat messages:", error);
        setError("Failed to load messages");
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage],
  );

  // Set current chat ID and load messages
  useEffect(() => {
    const initChat = async () => {
      if (!chatId) {
        setError("No chat ID provided");
        setIsLoading(false);
        return;
      }

      try {
        // If chat doesn't exist in the store, try to fetch it
        const chatExists = useChatStore.getState().chats[chatId];
        if (!chatExists) {
          // Fetch all chats to see if this one exists
          const chats = await retrieveChatsLocalDb();
          const chatData = chats.find((chat) => chat.id === chatId);

          if (!chatData) {
            setError(`Chat with ID ${chatId} not found`);
            setIsLoading(false);
            return;
          }

          // Create the chat in the store
          useChatStore
            .getState()
            .createChat(
              chatId,
              chatData.title,
              chatData.createdAt,
              chatData.updatedAt,
              chatData.activeBranch,
              chatData.pinned,
            );
        }

        // Set current chat ID in store
        setCurrentChatId(chatId);

        // Load messages for this chat
        await loadMessages(chatId);

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing chat:", err);
        setError("Failed to load chat data");
        setIsLoading(false);
      }
    };

    initChat();
  }, [chatId, setCurrentChatId, loadMessages]);

  // Streaming response logic.
  const streamResponse = useCallback(
    async (
      userMessage: LocalMessage,
      assistantMessage: LocalMessage,
      history?: LocalMessage[],
    ) => {
      if (!currentChatId) return;
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

  // Edit message handler: similar changes with immediate sync.
  const handleEditMessage = useCallback(
    async (editedMessage: LocalMessage) => {
      logger.debug("Editing message:", editedMessage);
      if (!currentChatId) return;
      const parentId = editedMessage.parentId;
      let history: LocalMessage[] = [];
      const chat = useChatStore.getState().chats[currentChatId];
      if (!chat) return;

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
            ? [...parent.childrenIds, userMessageId]
            : [userMessageId];
          updateMessageLocalDb(parentId, { childrenIds: updatedChildren });
          const updatedParent = { ...parent, childrenIds: updatedChildren };
          addMessage(currentChatId, updatedParent);
        }
      }

      addMessage(currentChatId, userMessage);
      addMessage(currentChatId, assistantMessage);

      // Update the branch before streaming to ensure UI shows the edited message
      editBranch(currentChatId, parentId, userMessageId);

      // Make sure we update the local DB with the new active branch immediately
      const updatedBranch =
        useChatStore.getState().chats[currentChatId].activeBranch;
      updateChatLocalDb(currentChatId, {
        activeBranch: updatedBranch,
        updatedAt: now,
      });

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

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col grow text-center justify-center opacity-50">
        <div className="flex items-end gap-2 justify-center">
          <div className="text-3xl">Loading chat</div>
          <BouncingDotsIcon fill="var(--color-fg0)" className="scale-120" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col grow text-center justify-center opacity-50">
        <div className="text-3xl">Error loading chat</div>
        <div className="italic">{error}</div>
      </div>
    );
  }

  return (
    <ChatBox
      isChatLoaded={!!currentChatId}
      onMessageEdit={(message) => handleEditMessage(message)}
      onBranchChange={(messageId: string, versionIndex: number) => {
        if (!currentChatId) return;
        changeBranch(currentChatId!, messageId, versionIndex);
        updateChatLocalDb(currentChatId, {
          activeBranch:
            useChatStore.getState().chats[currentChatId!].activeBranch,
        });
      }}
    />
  );
}
