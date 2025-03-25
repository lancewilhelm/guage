"use client";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatPage() {
  const { currentChatId, setCurrentChatId } = useChatStore();

  useEffect(() => {
    if (currentChatId) setCurrentChatId(undefined);
  }, [currentChatId, setCurrentChatId]);

  return (
    <div className="w-full h-full flex flex-col grow text-center justify-center opacity-50">
      <div className="text-3xl">New Chat</div>
      <div className="font-thin text-lg">
        Send your first message in the input box below
      </div>
      <div className="font-thin text-xl">or</div>
      <div className="font-thin text-lg">
        Load a session in the panel on the left
      </div>
    </div>
  );
}
