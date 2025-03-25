"use client";
import React, { useEffect, useState, useCallback } from "react";
import ChatBox from "@/components/ChatBox";
import { useChatStore } from "@/store/chatStore";
import {
  dbRetrieveChats,
  dbRetrieveMessages,
  dbUpdateChat,
  LocalMessage,
} from "@/utils/db/local";
import { useParams } from "next/navigation";
import { handleEditMessage } from "@/utils/chat";

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

  const { currentChatId, setCurrentChatId, addMessage, changeBranch } =
    useChatStore();

  const [error, setError] = useState<string | null>(null);

  // Load chat messages from IndexedDB
  const loadMessages = useCallback(
    async (chatId: string) => {
      if (!chatId) return;

      try {
        const chats = useChatStore.getState().chats;
        if (!chats[chatId] || Object.keys(chats[chatId].messages).length)
          return;

        const data = await dbRetrieveMessages(chatId);
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
      }
    },
    [addMessage],
  );

  // Set current chat ID and load messages
  useEffect(() => {
    const initChat = async () => {
      if (!chatId) {
        setError("No chat ID provided");
        return;
      }

      try {
        // Check if this chat is already the active one
        if (
          currentChatId === chatId &&
          Object.keys(useChatStore.getState().chats[chatId]?.messages || {})
            .length > 0
        ) {
          return;
        }

        // If chat doesn't exist in the store, try to fetch it
        const chatExists = useChatStore.getState().chats[chatId];
        if (!chatExists) {
          // Fetch all chats to see if this one exists
          const chats = await dbRetrieveChats();
          const chatData = chats.find((chat) => chat.id === chatId);

          if (!chatData) {
            setError(`Chat with ID ${chatId} not found`);
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
      } catch (err) {
        console.error("Error initializing chat:", err);
        setError("Failed to load chat data");
      }
    };

    initChat();
  }, [chatId, setCurrentChatId, loadMessages, currentChatId]);

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
      onMessageEdit={(message) => {
        handleEditMessage(message);
      }}
      onBranchChange={(messageId: string, versionIndex: number) => {
        if (!currentChatId) return;
        changeBranch(currentChatId!, messageId, versionIndex);
        dbUpdateChat(currentChatId, {
          activeBranch:
            useChatStore.getState().chats[currentChatId!].activeBranch,
        });
      }}
    />
  );
}
