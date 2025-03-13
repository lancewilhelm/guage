"use client";
import { useState, useEffect } from "react";
import ChatBox from "@/components/ChatBox";
import InputRow from "@/components/InputRow";
import SessionsSidePanel from "@/components/SessionsSidePanel";
import { ChatMessage } from "@/components/ChatBubble";
import Header from "@/components/Header";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | undefined
  >(undefined);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);

  const loadChatSession = async (sessionId: string) => {
    setCurrentChatSessionId(sessionId);
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch chat messages");
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // call loadChatSession when the sessionId changes
  useEffect(() => {
    if (currentChatSessionId) {
      loadChatSession(currentChatSessionId);
    }
  }, [currentChatSessionId]);

  // Scroll the chatbax to the bottom as messages are added
  const scrollToBottom = () => {
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Call the scroll to the bottom function as messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle the submission of new messages to the backend
   */
  const handleSubmit = async () => {
    if (!userInput.trim() || isLoading || currentChatSessionId === undefined)
      return;

    // Add the user message to the list
    const userMessage: ChatMessage = { role: "user", content: userInput };
    setMessages((prev) => [...prev, userMessage]);

    // Set some variables
    setIsLoading(true);
    setUserInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId: currentChatSessionId,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Add an empty assistant message that will be filled with the streaming response
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulatedResponse },
        ]);
      }
    } catch (error) {
      console.error("Error connecting to the chat API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className="col-start-2">
        <Header
          isSessionButtonVisible={!isSessionPanelVisible}
          toggleSessionPanel={() => {
            setIsSessionPanelVisible(!isSessionPanelVisible);
          }}
        />
      </div>

      <div className="col-start-1 row-start-1 row-span-3">
        <SessionsSidePanel
          currentChatSessionId={currentChatSessionId}
          setCurrentChatSessionId={setCurrentChatSessionId}
          isVisible={isSessionPanelVisible}
          setIsVisible={setIsSessionPanelVisible}
        />
      </div>

      {/* Center: Chat */}
      <div className="col-start-2 row-start-2 overflow-y-auto overflow-x-hidden chat-container">
        <ChatBox
          messages={messages}
          isLoading={isLoading}
          isSessionLoaded={!!currentChatSessionId}
        />
      </div>

      <InputRow
        submitHandler={handleSubmit}
        inputValue={userInput}
        setInputValue={setUserInput}
        isLoading={isLoading}
        buttonLabel="send"
        disabled={!currentChatSessionId}
      />
    </div>
  );
}
