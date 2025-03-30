"use client";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatPage() {
  const { currentChatId, setCurrentChatId } = useChatStore();

  useEffect(() => {
    if (currentChatId) setCurrentChatId(undefined);
  }, [currentChatId, setCurrentChatId]);
}
