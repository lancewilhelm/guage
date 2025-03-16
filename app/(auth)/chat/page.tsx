"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/utils/logger";
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
import { v4 as uuidv4 } from "uuid";

export interface TempMessage {
  role: "user" | "assistant";
  content: string;
  parentId: string | null;
  id: string;
  childrenIds: string[] | null;
  depth: number;
}

export type DisplayMessage = SelectMessage | TempMessage;

export default function Chat() {
  const [chatSessions, setChatSessions] = useState<SelectChatSession[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [thread, setThread] = useState<DisplayMessage[]>([]);
  const threadIndicesRef = useRef<{ [key: number]: number }>({});
  const threadMessageCountsRef = useRef<{ [key: number]: number }>({});
  const [maxDepth, setMaxDepth] = useState(0);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | undefined
  >(undefined);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add memoization for handlers that don't change often
  /**
   * Stop the stream of messages from the LLM API
   */
  const handleStopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  /**
   * Fetch messages from the backend
   * Memoized to prevent unnecessary re-renders
   */
  const fetchMessages = useCallback(async (sessionId: string) => {
    logger.debug("Fetching messages for session", { sessionId });
    try {
      const response = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to fetch chat messages");
      return await response.json();
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    }
  }, []);

  async function loadChatSession(sessionId: string) {
    setCurrentChatSessionId(sessionId);
    try {
      setIsLoading(true);

      const data = await fetchMessages(sessionId);
      setMessages(data);
      logger.debug("Chat session loaded", {
        sessionId,
        messageCount: data.length,
      });
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
   * Handle the submission of new messages to the backend
   */
  async function handleSubmit() {
    logger.debug("Handling message submission", {
      inputLength: userInput.length,
      sessionId: currentChatSessionId,
    });
    if (!userInput.trim() || isLoading || currentChatSessionId === undefined)
      return;

    // Add the user message to the list
    let parentId: string | null = null;
    let depth = 0;
    if (thread.length > 0) {
      const lastMessage = thread[thread.length - 1];
      if (lastMessage.role === "assistant") {
        parentId = lastMessage.id;
        depth = lastMessage.depth + 1;
      }
    }

    // Generate the client UUIDs for the messages
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();

    const userMessage: TempMessage = {
      role: "user",
      content: userInput,
      parentId: parentId,
      id: userMessageId,
      childrenIds: [assistantMessageId],
      depth: depth,
    };

    // Increase the depth of the message
    depth += 1;

    setMessages((prev) => [...prev, userMessage]);
    setThread((prev) => [...prev, userMessage]);

    // Set some variables
    setIsStreaming(true);
    setUserInput("");

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add an empty assistant message that will be filled with the streaming response
    const assistantMessage: TempMessage = {
      role: "assistant",
      content: "",
      parentId: userMessageId,
      id: assistantMessageId,
      childrenIds: null,
      depth: depth,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setThread((prev) => [...prev, assistantMessage]);
    logger.debug("Created message pair", {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      depth,
    });

    let accumulatedResponse = "";
    const isFirstResponse =
      messages.filter((msg) => msg.role === "assistant").length === 0;

    function handleMessageChunk({ eventType, data }: SSEChunk) {
      if (eventType === "messageChunk") {
        accumulatedResponse += data;
        // logger.debug("Received chunk", {
        //   chunkSize: data.length,
        //   totalSize: accumulatedResponse.length,
        // });
        updateMessageContent(assistantMessage.id, accumulatedResponse);
      } else if (
        eventType === "userMessage" ||
        eventType === "assistantMessage"
      ) {
        const messageResult = JSON.parse(data);
        const originalMessage =
          eventType === "userMessage" ? userMessage : assistantMessage;
        updateMessageIds(originalMessage, messageResult);
      } else if (eventType === "error") {
        console.error("Error streaming response:", data);
      }
    }

    // Helper function to update messages and thread with new content
    function updateMessageContent(messageId: string, content: string) {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg,
        );

        // Also update the thread in the same update cycle
        const threadWithUpdates = updated.filter((msg) =>
          thread.some((t) => t.id === msg.id),
        );
        setThread(threadWithUpdates);
        return updated;
      });

      // setThread((prev) => {
      //   return prev.map((msg) =>
      //     msg.id === messageId ? { ...msg, content } : msg,
      //   );
      // });
    }

    // Helper function to update IDs from client-generated to server-generated
    function updateMessageIds(
      originalMessage: DisplayMessage,
      serverMessage: DisplayMessage,
    ) {
      logger.debug("Updating message IDs", {
        originalMessage: originalMessage,
        serverMessage,
      });
      const updateCollection = (messages: DisplayMessage[]) => {
        return messages.map((msg) => {
          // Replace the message with server version
          if (msg.id === originalMessage.id) {
            return {
              ...serverMessage,
              childrenIds: originalMessage.childrenIds,
            };
          }

          // Update any references to the old ID in parentId
          if (msg.parentId === originalMessage.id) {
            return { ...msg, parentId: serverMessage.id };
          }

          // Update any references in childrenIds array
          if (msg.childrenIds && msg.childrenIds.includes(originalMessage.id)) {
            const newChildrenIds = msg.childrenIds.map((childId) =>
              childId === originalMessage.id ? serverMessage.id : childId,
            );
            logger.debug("Updating childrenIds", {
              msg,
              newChildrenIds,
            });
            return { ...msg, childrenIds: newChildrenIds };
          }

          return msg;
        });
      };

      setMessages(updateCollection);
      setThread(updateCollection);
    }

    logger.debug("Streaming response", {
      sessionId: currentChatSessionId,
      messageId: userMessage.id,
      isFirstResponse,
    });
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
      logger.debug("Stream completed", {
        responseLength: accumulatedResponse.length,
      });
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
    logger.debug("Creating new chat session");
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
    logger.debug("Renaming session", { sessionId, title });
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
    logger.debug("Deleting session", { sessionId });
    const result = await deleteChatSession(sessionId);
    if (result) {
      setChatSessions(
        chatSessions.filter((session) => session.id !== sessionId),
      );
      if (sessionId === currentChatSessionId) {
        setMessages([]);
        setThread([]);
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
    logger.debug("Generating thread", {
      messages: messages,
    });

    const rootMessages = messages.filter(
      (message) => message.parentId === null,
    );
    let currentMessage: DisplayMessage | undefined =
      rootMessages[threadIndicesRef.current[0]];
    newThread.push(currentMessage);
    logger.debug("generateThread:", {
      i: 0,
      currentMessage,
    });
    for (let i = 1; i <= maxDepth; i++) {
      currentMessage = messages.find(
        (message) =>
          message.id ===
          currentMessage?.childrenIds?.[threadIndicesRef.current[i]],
      );
      logger.debug("generateThread:", {
        i,
        currentMessage,
      });
      if (currentMessage) {
        newThread.push(currentMessage);
      } else {
        break;
      }
    }

    logger.debug("generateThread:", {
      maxDepth,
      threadIndices: threadIndicesRef.current,
      messageCounts: threadMessageCountsRef.current,
      newThread: newThread,
    });
    setThread(newThread);
  }, [messages, maxDepth]);

  // Call the scroll to the bottom function as messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
      const newMaxDepth = Math.max(
        ...messages.map((msg) => (msg.depth ? msg.depth : 0)),
      );
      setMaxDepth(newMaxDepth);

      // Batch to reduce re-renders
      setTimeout(() => {
        generateThreadIndices();
        generateThreadMessageCounts();
        generateThread();
      }, 0);
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
