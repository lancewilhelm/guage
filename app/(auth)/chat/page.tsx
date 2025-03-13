"use client";
import { useState, useEffect, useRef } from "react";
import ChatBox from "@/components/ChatBox";
import InputRow from "@/components/InputRow";
import SessionsSidePanel from "@/components/SessionsSidePanel";
import { ChatMessage } from "@/components/ChatBubble";
import Header from "@/components/Header";
import { streamLlmResponse } from "@/utils/apiHelpers";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | undefined
  >(undefined);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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
   * Handle stopping the current response stream
   */
  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

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
    setIsStreaming(true);
    setUserInput("");

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add an empty assistant message that will be filled with the streaming response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let accumulatedResponse = "";

    function handleMessageChunk(chunk: string) {
      accumulatedResponse += chunk;
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: accumulatedResponse },
      ]);
    }

    try {
      await streamLlmResponse(
        [...messages, userMessage],
        currentChatSessionId,
        handleMessageChunk,
        abortControllerRef.current,
      );
    } catch (error) {
      console.error("Error connecting to the chat API:", error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
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
        stopHandler={handleStopStream}
        inputValue={userInput}
        setInputValue={setUserInput}
        isLoading={isLoading}
        isStreaming={isStreaming}
        buttonLabel="send"
        disabled={!currentChatSessionId}
      />
    </div>
  );
}
