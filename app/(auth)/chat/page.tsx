"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ChatBox from "@/components/ChatBox";
import InputRow from "@/components/InputRow";
import SessionsSidePanel from "@/components/SessionsSidePanel";
import Header from "@/components/Header";
import { SelectChatSession, SelectMessage } from "@/utils/db/schema";
import {
  fetchChatSessions,
  createChatSession,
  deleteChatSession,
  updateChatSession,
  streamLlmResponse,
  SSEChunk,
} from "@/utils/apiHelpers";
import { captureRejectionSymbol } from "node:events";

export interface TempMessage {
  role: "user" | "assistant";
  content: string;
  parentId?: string;
  id?: string;
  childrenIds?: string[];
  depth?: number;
}

export type DisplayMessage = SelectMessage | TempMessage;

export default function Chat() {
  const [chatSessions, setChatSessions] = useState<SelectChatSession[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [thread, setThread] = useState<DisplayMessage[]>([]);
  const threadIndicesRef = useRef<{ [key: number]: number }>({});
  const threadMessageCountsRef = useRef<{ [key: number]: number }>({});
  const [leafMessage, setLeafMessage] = useState<DisplayMessage>();
  const [maxDepth, setMaxDepth] = useState(0);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | undefined
  >(undefined);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadChatSession(sessionId: string) {
    setCurrentChatSessionId(sessionId);
    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch chat messages");

      const data: SelectMessage[] = await response.json();
      setMessages(data);
      setLeafMessage(data[data.length - 1]);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    } finally {
      setIsLoading(false);
    }
  }

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
  async function handleSubmit() {
    if (!userInput.trim() || isLoading || currentChatSessionId === undefined)
      return;

    // Add the user message to the list
    let parentId: string | undefined;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        parentId = lastMessage.id;
      }
    }
    const userMessage: TempMessage = {
      role: "user",
      content: userInput,
      parentId: parentId,
    };
    setMessages((prev) => [...prev, userMessage]);
    setThread((prev) => [...prev, userMessage]);

    // Set some variables
    setIsStreaming(true);
    setUserInput("");

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add an empty assistant message that will be filled with the streaming response
    const assistantMessage: TempMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);
    setMessages((prev) => [...prev, assistantMessage]);

    let accumulatedResponse = "";
    const isFirstResponse =
      messages.filter((msg) => msg.role === "assistant").length === 0;

    function handleMessageChunk({ eventType, data }: SSEChunk) {
      // Replace the messages with their database versions or append chunks to the temporary assistant message
      if (eventType === "userMessage") {
        const insertUserMessageResult = JSON.parse(data);
        setMessages((prev) => [
          ...prev.slice(0, -2),
          insertUserMessageResult,
          assistantMessage,
        ]);
        setThread((prev) => [
          ...prev.slice(0, -2),
          insertUserMessageResult,
          assistantMessage,
        ]);
      } else if (eventType === "assistantMessage") {
        const insertAsssistantMessageResult = JSON.parse(data);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          insertAsssistantMessageResult,
        ]);
        setThread((prev) => [
          ...prev.slice(0, -1),
          insertAsssistantMessageResult,
        ]);
      } else if (eventType === "messageChunk") {
        accumulatedResponse += data;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulatedResponse },
        ]);
        setThread((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulatedResponse },
        ]);
      } else if (eventType === "error") {
        console.error("Error streaming response:", data);
      }
    }

    try {
      await streamLlmResponse(
        messages,
        userMessage,
        currentChatSessionId,
        handleMessageChunk,
        abortControllerRef.current,
        isFirstResponse,
      );
    } catch (error) {
      console.error("Error connecting to the chat API:", error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (isFirstResponse) {
        await fetchSessions();
      }
    }
  }

  /**
   * Create a new chat session
   */
  async function createSession() {
    const newChatSession = await createChatSession();
    setChatSessions([newChatSession, ...chatSessions]);
    setCurrentChatSessionId(newChatSession.id);
  }

  /**
   * Fetch the chat sessions from the backend
   */
  async function fetchSessions() {
    const data = await fetchChatSessions();
    if (data) {
      setChatSessions(data);
    }
  }

  /**
   * Update the chat session title
   */
  async function renameSession(sessionId: string, title: string) {
    const updatedSession = await updateChatSession(sessionId, { title });
    if (updatedSession) {
      setChatSessions(
        chatSessions.map((session) =>
          session.id === sessionId ? { ...session, title } : session,
        ),
      );
    } else {
      console.error("Failed to update chat session");
    }
  }

  /**
   * Delete a chat session
   */
  async function deleteSession(sessionId: string) {
    const result = await deleteChatSession(sessionId);
    if (result) {
      setChatSessions(
        chatSessions.filter((session) => session.id !== sessionId),
      );
      if (sessionId === currentChatSessionId) {
        setMessages([]);
        setCurrentChatSessionId(undefined);
      }
    } else {
      console.error("Failed to delete chat session");
    }
  }

  /**
   * Update a message that has been edited
   */
  async function handleEditMessage(message: DisplayMessage) {}

  /**
   * Generates an array of indices for each depth of the tree to max depth. Defaults to 0
   * This will be used to show what the current message index is for each depth
   */
  const generateThreadIndices = useCallback(() => {
    if (Object.keys(threadIndicesRef.current).length === 0) {
      for (let i = 0; i <= maxDepth; i++) {
        threadIndicesRef.current[i] = 0;
      }
    } else {
      // Check if we need to add new indices
      for (let i = 0; i <= maxDepth; i++) {
        if (threadIndicesRef.current[i] === undefined) {
          threadIndicesRef.current[i] = 0;
        }
      }
    }
  }, [maxDepth]);

  /**
   * Generates an array of the number of nodes at each depth
   * This acts as the denominator for the thread indices
   */
  const generateThreadMessageCounts = useCallback(() => {
    const rootMessages = messages.filter(
      (message) => message.parentId === null,
    );
    threadMessageCountsRef.current[0] = rootMessages.length;

    let currentMessage: DisplayMessage | undefined =
      messages[threadIndicesRef.current[0]];

    for (let i = 1; i <= maxDepth; i++) {
      threadMessageCountsRef.current[i] = currentMessage.childrenIds
        ? currentMessage.childrenIds.length
        : 0;
      currentMessage = messages.find(
        (message) =>
          currentMessage?.childrenIds &&
          message.id ===
            currentMessage.childrenIds[threadIndicesRef.current[i]],
      );
      if (!currentMessage) {
        break;
      }
    }
  }, [messages, maxDepth]);

  /**
   * Generates the chat thread from the nodeIndices
   */
  const generateThread = useCallback(() => {
    const newThread: DisplayMessage[] = [];

    const rootMessages = messages.filter(
      (message) => message.parentId === null,
    );
    let currentMessage: DisplayMessage | undefined =
      rootMessages[threadIndicesRef.current[0]];
    newThread.push(currentMessage);
    for (let i = 1; i <= maxDepth; i++) {
      currentMessage = messages.find(
        (message) =>
          message.id ===
          currentMessage?.childrenIds?.[threadIndicesRef.current[i]],
      );
      if (currentMessage) {
        newThread.push(currentMessage);
      } else {
        break;
      }
    }

    console.log("maxdepth:", maxDepth);
    console.log("threadIndicesRef:", threadIndicesRef.current);
    console.log("threadMessageCountsRef:", threadMessageCountsRef.current);
    console.log("thread:", newThread);
    setThread(newThread);
  }, [messages, maxDepth]);

  // ====================
  // UseEfects
  // ====================
  // Call the scroll to the bottom function as messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
      setMaxDepth(
        Math.max(...messages.map((msg) => (msg.depth ? msg.depth : 0))),
      );
      generateThreadIndices();
      generateThreadMessageCounts();
      generateThread();
    }
  }, [
    messages,
    generateThreadIndices,
    generateThreadMessageCounts,
    generateThread,
  ]);

  // Fetch all sessions and call loadChatSession when
  // the component mounts and sessionId changes
  useEffect(() => {
    fetchSessions();
    if (currentChatSessionId) {
      loadChatSession(currentChatSessionId);
    }
  }, [currentChatSessionId]);

  return (
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className="col-start-2">
        <Header
          isSessionButtonVisible={!isSessionPanelVisible}
          toggleSessionPanel={() => {
            setIsSessionPanelVisible(!isSessionPanelVisible);
          }}
          createChatSession={createSession}
        />
      </div>

      <div className="col-start-1 row-start-1 row-span-3">
        <SessionsSidePanel
          chatSessions={chatSessions}
          currentChatSessionId={currentChatSessionId}
          setCurrentChatSessionId={setCurrentChatSessionId}
          isVisible={isSessionPanelVisible}
          setIsVisible={setIsSessionPanelVisible}
          createHandler={createSession}
          deleteHandler={deleteSession}
          renameHandler={renameSession}
        />
      </div>

      {/* Center: Chat & InputRow */}
      <div className="col-start-2 row-start-2 row-span-2 h-full flex flex-col">
        <div className="flex flex-grow overflow-y-auto overflow-x-hidden chat-container">
          <div className="mx-auto w-full max-w-[1000px]">
            <ChatBox
              thread={thread}
              threadIndices={threadIndicesRef.current}
              threadMessageCounts={threadMessageCountsRef.current}
              isSessionLoaded={!!currentChatSessionId}
              onMessageEdit={(message: DisplayMessage) =>
                handleEditMessage(message)
              }
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1000px]">
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
      </div>
    </div>
  );
}
