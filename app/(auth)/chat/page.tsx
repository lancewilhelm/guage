"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  role: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  id: string;
  childrenIds: string[] | null;
  depth: number;
}

export type DisplayMessage = SelectMessage | TempMessage;

export type MessageMap = Record<string, DisplayMessage>;

// Tracks the state of the currently active thread
export interface ThreadState {
  activePath: string[]; // Ordered list of message IDs forming the active conversation path
  siblingInfo: Record<
    string,
    {
      total: number;
      currentIndex: number;
      siblingIds: string[];
    }
  >;
}

export default function Chat() {
  const [chatSessions, setChatSessions] = useState<SelectChatSession[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [messageMap, setMessageMap] = useState<MessageMap>({});
  const [threadState, setThreadState] = useState<ThreadState>({
    activePath: [],
    siblingInfo: {},
  });
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | undefined
  >(undefined);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const pendingBranchChange = useRef<{
    messageId: string;
    siblingIndex: number;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive the active thread from the thread state and message map
  const thread = useMemo(() => {
    if (!threadState.activePath.length) return [];
    const t = threadState.activePath
      .map((id) => messageMap[id])
      .filter(Boolean) as DisplayMessage[];
    logger.debug("thread:", {
      thread: t,
      activePath: threadState.activePath,
      messageMap,
    });
    return t;
  }, [threadState.activePath, messageMap]);

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
    logger.debug("fetchMessages:", { sessionId });
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

  const loadChatSession = useCallback(
    async (sessionId: string) => {
      setCurrentChatSessionId(sessionId);
      try {
        setIsLoading(true);

        const data = await fetchMessages(sessionId);
        setMessages(data);
        logger.debug("loadChatSession:", {
          sessionId,
          messageCount: data.length,
        });
      } catch (error) {
        console.error("Error fetching chat messages:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMessages],
  );

  /**
   * Core function to handle message creation and response generation
   * Used by both new messages and edited messages
   */
  async function createMessagePairAndStream(
    newMessage: TempMessage,
    responseMessage: TempMessage,
    contextMessages: DisplayMessage[],
    isFirstResponse: boolean = false,
  ) {
    // Update messages with the new message pair
    setMessages((prev) => [...prev, newMessage, responseMessage]);

    // Set up streaming state
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    logger.debug("createMessagePairAndStream:", {
      userMessageId: newMessage.id,
      assistantMessageId: responseMessage.id,
      depth: newMessage.depth,
    });

    let accumulatedResponse = "";

    function handleMessageChunk({ eventType, data }: SSEChunk) {
      if (eventType === "messageChunk") {
        accumulatedResponse += JSON.parse(data);
        updateMessageContent(responseMessage.id, accumulatedResponse);
      } else if (
        eventType === "userMessage" ||
        eventType === "assistantMessage"
      ) {
        const messageResult = JSON.parse(data);
        const originalMessage =
          eventType === "userMessage" ? newMessage : responseMessage;
        updateMessageIds(originalMessage, messageResult);
      } else if (eventType === "error") {
        console.error("Error streaming response:", data);
      }
    }

    logger.debug("streamLlmResponse:", {
      sessionId: currentChatSessionId,
      messageId: newMessage.id,
      isFirstResponse,
    });

    try {
      await streamLlmResponse(
        contextMessages,
        newMessage,
        currentChatSessionId!,
        handleMessageChunk,
        abortControllerRef.current,
        isFirstResponse,
      );
    } catch (error) {
      console.error("Error connecting to the chat API:", error);
    } finally {
      setIsStreaming(false);
      logger.debug("stream completed:", {
        responseLength: accumulatedResponse.length,
      });
      abortControllerRef.current = null;

      if (isFirstResponse) {
        await fetchSessions();
      }

      return responseMessage.id;
    }
  }

  /**
   * Helper function to update messages with new content
   */
  function updateMessageContent(messageId: string, content: string) {
    setMessages((prev) => {
      return prev.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg,
      );
    });
  }

  /**
   * Helper function to update IDs from client-generated to server-generated
   */
  function updateMessageIds(
    originalMessage: DisplayMessage,
    serverMessage: DisplayMessage,
  ) {
    logger.debug("updateMessageIds", {
      originalMessage: originalMessage,
      serverMessage,
    });

    setMessages((prev) => {
      return prev.map((msg) => {
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
          return { ...msg, childrenIds: newChildrenIds };
        }

        return msg;
      });
    });

    // Also update thread state to reflect the new message ID
    setThreadState((prev) => {
      const newActivePath = prev.activePath.map((id) =>
        id === originalMessage.id ? serverMessage.id : id,
      );

      // Clone and update siblingInfo to use new IDs
      const newSiblingInfo = { ...prev.siblingInfo };

      // If the message ID is a key in siblingInfo, update it
      if (prev.siblingInfo[originalMessage.id]) {
        newSiblingInfo[serverMessage.id] = prev.siblingInfo[originalMessage.id];
        delete newSiblingInfo[originalMessage.id];
      }

      // For all sibling infos, update IDs in siblingIds arrays
      Object.keys(newSiblingInfo).forEach((key) => {
        newSiblingInfo[key] = {
          ...newSiblingInfo[key],
          siblingIds: newSiblingInfo[key].siblingIds.map((id) =>
            id === originalMessage.id ? serverMessage.id : id,
          ),
        };
      });

      return {
        activePath: newActivePath,
        siblingInfo: newSiblingInfo,
      };
    });
  }

  /**
   * Handle the submission of new messages to the backend
   */
  async function handleSubmit() {
    logger.debug("handleSubmit:", {
      inputLength: userInput.length,
      sessionId: currentChatSessionId,
    });

    if (!userInput.trim() || isLoading || currentChatSessionId === undefined)
      return;

    // Add the user message to the list
    let parentId: string | null = null;
    let depth = 0;
    if (threadState.activePath.length > 0) {
      const lastMessage = messageMap[threadState.activePath.slice(-1)[0]];
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
      createdAt: new Date(),
      id: userMessageId,
      childrenIds: [assistantMessageId],
      depth: depth,
    };

    // Increase the depth for the response
    depth += 1;

    const assistantMessage: TempMessage = {
      role: "assistant",
      content: "",
      parentId: userMessageId,
      createdAt: new Date(),
      id: assistantMessageId,
      childrenIds: null,
      depth: depth,
    };

    // Update the childrenIds of the parent message
    if (parentId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === parentId
            ? {
                ...msg,
                childrenIds: Array.isArray(msg.childrenIds)
                  ? [...msg.childrenIds, userMessageId]
                  : [userMessageId],
              }
            : msg,
        ),
      );
    }

    // Add the assistant message to messages, and thread state
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setThreadState((prev) => {
      return {
        activePath: [...prev.activePath, userMessage.id, assistantMessage.id],
        siblingInfo: {
          ...prev.siblingInfo,
          [assistantMessage.id]: {
            total: 1,
            currentIndex: 0,
            siblingIds: [assistantMessage.id],
          },
          [userMessage.id]: {
            total: 1,
            currentIndex: 0,
            siblingIds: [userMessage.id],
          },
        },
      };
    });

    // Clear input field
    setUserInput("");

    // Determine if this is the first response
    const isFirstResponse =
      messages.filter((msg) => msg.role === "assistant").length === 0;

    // Create message pair and stream response
    await createMessagePairAndStream(
      userMessage,
      assistantMessage,
      thread.length > 0 ? [...thread] : [],
      isFirstResponse,
    );
  }

  /**
   * Create a new chat session
   */
  async function createSession() {
    logger.debug("createSession:");
    const newChatSession = await createChatSession();
    setChatSessions([newChatSession, ...chatSessions]);
    setCurrentChatSessionId(newChatSession.id);
    setThreadState({ activePath: [], siblingInfo: {} });
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
    logger.debug("renameSession:", { sessionId, title });
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
    logger.debug("deleteSession:", { sessionId });
    const result = await deleteChatSession(sessionId);
    if (result) {
      setChatSessions(
        chatSessions.filter((session) => session.id !== sessionId),
      );
      if (sessionId === currentChatSessionId) {
        setMessages([]);
        setThreadState({ activePath: [], siblingInfo: {} });
        setCurrentChatSessionId(undefined);
      }
    } else {
      console.error("Failed to delete chat session");
    }
  }

  function generateThreadState(messageMap: MessageMap): ThreadState {
    const threadState: ThreadState = {
      activePath: [],
      siblingInfo: {},
    };

    // Find the root message(s)
    const rootMessages = Object.values(messageMap)
      .map((node) => node)
      .filter((msg) => msg.parentId === null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    if (rootMessages.length === 0) return threadState; // No messages

    // Start at the first root message
    let currentNode = rootMessages[0];

    // Handle info for the root level
    threadState.siblingInfo[currentNode.id] = {
      total: rootMessages.length,
      currentIndex: 0,
      siblingIds: rootMessages.map((msg) => msg.id),
    };
    threadState.activePath.push(currentNode.id);

    // Traverse down following the first child at each level
    while (currentNode.childrenIds && currentNode.childrenIds.length > 0) {
      const siblingCount = currentNode.childrenIds.length;
      const siblingIds = currentNode.childrenIds;
      currentNode = messageMap[currentNode.childrenIds[0]];

      // Add sibling information for this parent
      threadState.siblingInfo[currentNode.id] = {
        total: siblingCount,
        currentIndex: 0,
        siblingIds: [...siblingIds],
      };
      threadState.activePath.push(currentNode.id);
    }

    logger.debug("generateThreadState:", { threadState, messageMap });
    return threadState;
  }

  const changeBranch = useCallback(
    (messageId: string, newSiblingIndex: number) => {
      setThreadState((prev) => {
        // Get sibling info
        const siblingInfo = prev.siblingInfo[messageId];
        if (!siblingInfo || newSiblingIndex >= siblingInfo.total) return prev;

        // Get the sibling ID to switch to
        const newSiblingId = siblingInfo.siblingIds[newSiblingIndex];

        logger.debug("changeBranch:", {
          messageId,
          newSiblingId,
        });

        // Create new sibling info
        const newSiblingInfo = {
          ...prev.siblingInfo,
          [newSiblingId]: {
            ...siblingInfo,
            currentIndex: newSiblingIndex,
          },
        };

        // Determine where in the path to make the change
        const messageIndex = messageId
          ? prev.activePath.indexOf(messageId)
          : -1;
        let newPath: string[];

        if (messageId === null || messageIndex === -1) {
          // Root level change or parent not in path
          newPath = [newSiblingId];
        } else {
          // Truncate path at parent and add new sibling
          newPath = [...prev.activePath.slice(0, messageIndex)];
          newPath.push(newSiblingId);
        }

        // Build the rest of the path following first children
        let currentNode = messageMap[newSiblingId];

        while (currentNode.childrenIds && currentNode.childrenIds.length > 0) {
          const siblingCount = currentNode.childrenIds.length;
          const siblingIds = currentNode.childrenIds;
          currentNode = messageMap[currentNode.childrenIds[0]];

          // Add sibling information for this new parent if not already present
          if (!newSiblingInfo[currentNode.id]) {
            newSiblingInfo[currentNode.id] = {
              total: siblingCount,
              currentIndex: 0,
              siblingIds: [...siblingIds],
            };
          }
          newPath.push(currentNode.id);
        }
        logger.debug("changeBranch:", newPath, newSiblingInfo);
        return {
          activePath: newPath,
          siblingInfo: newSiblingInfo,
        };
      });
    },
    [messageMap],
  );

  // Handle message edits - create a new branch when a message is edited
  async function handleEditMessage(message: DisplayMessage) {
    logger.debug("handleEditMessage:", { messageId: message.id });

    // Generate new UUIDs for the edited message and its response
    const editedMessageId = uuidv4();
    const responseMessageId = uuidv4();

    // Create the edited message as a new branch
    const userMessage: TempMessage = {
      role: message.role,
      content: message.content,
      parentId: message.parentId,
      createdAt: new Date(),
      id: editedMessageId,
      childrenIds: [responseMessageId],
      depth: message.depth,
    };

    // Create a placeholder for the assistant's response
    const assistantMessage: TempMessage = {
      role: "assistant",
      content: "",
      parentId: editedMessageId,
      createdAt: new Date(),
      id: responseMessageId,
      childrenIds: null,
      depth: message.depth + 1,
    };

    // Get context for this message by finding parent in thread
    const parentIndex = thread.findIndex((msg) => msg.id === message.parentId);
    let contextMessages: DisplayMessage[];

    if (parentIndex === -1) {
      // Parent not found in thread, use default logic
      contextMessages = messages;
    } else {
      // Get thread up to the parent + the edited message
      contextMessages = [...thread.slice(0, parentIndex + 1)];
    }

    const siblingPrevTotal = threadState.siblingInfo[message.id].total;
    const siblingPrevIndex = threadState.siblingInfo[message.id].currentIndex;
    const siblingPrevIds = threadState.siblingInfo[message.id].siblingIds;
    const newSiblingIds = [...siblingPrevIds, userMessage.id];
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setThreadState((prev) => {
      const newActivePath = [
        ...prev.activePath,
        userMessage.id,
        assistantMessage.id,
      ];
      return {
        activePath: newActivePath,
        siblingInfo: {
          ...prev.siblingInfo,
          [message.id]: {
            total: siblingPrevTotal + 1,
            currentIndex: siblingPrevIndex,
            siblingIds: newSiblingIds,
          },
          [userMessage.id]: {
            total: siblingPrevTotal + 1,
            currentIndex: siblingPrevTotal,
            siblingIds: newSiblingIds,
          },
          [assistantMessage.id]: {
            total: 1,
            currentIndex: 0,
            siblingIds: [assistantMessage.id],
          },
        },
      };
    });

    // Now that map is updated, we can safely change branch
    pendingBranchChange.current = {
      messageId: message.id,
      siblingIndex: siblingPrevTotal,
    };

    // Create message pair and stream response
    await createMessagePairAndStream(
      userMessage,
      assistantMessage,
      [...contextMessages],
      false,
    );
  }

  // Log the thread state when it changes
  useEffect(() => {
    logger.debug("threadState:", threadState);
  }, [threadState]);

  // Fetch chat sessions and load the current session on mount
  // Gets all of the messages for the current session
  useEffect(() => {
    async function initSession() {
      if (currentChatSessionId) {
        loadChatSession(currentChatSessionId);
      }
    }
    fetchSessions();
    initSession();
  }, [currentChatSessionId, loadChatSession]);

  // Update message map when messages change
  useEffect(() => {
    const map: MessageMap = {};

    // First pass: create message nodes
    messages.forEach((msg) => {
      map[msg.id] = msg;
    });

    logger.debug("setMessageMap:", {
      map,
    });
    setMessageMap(map);
  }, [messages]);

  // Initialize thread state when messageMap changes, only if it's empty
  useEffect(() => {
    if (Object.keys(messageMap).length > 0 && currentChatSessionId) {
      // Check if we need to regenerate thread state
      const isThreadEmpty = threadState.activePath.length === 0;
      const hasFirstMessageChanged =
        threadState.activePath.length > 0 &&
        !messageMap[threadState.activePath[0]];

      if (isThreadEmpty || hasFirstMessageChanged) {
        const newThreadState = generateThreadState(messageMap);
        // Only update if something actually changed to avoid render loops
        if (JSON.stringify(newThreadState) !== JSON.stringify(threadState)) {
          setThreadState(newThreadState);
        }
      }
    }
  }, [messageMap, currentChatSessionId, threadState]);

  useEffect(() => {
    if (pendingBranchChange.current) {
      const { messageId, siblingIndex } = pendingBranchChange.current;
      changeBranch(messageId, siblingIndex);
      pendingBranchChange.current = null;
    }
  }, [messageMap, changeBranch]);

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
              threadState={threadState}
              isSessionLoaded={!!currentChatSessionId}
              onMessageEdit={handleEditMessage}
              // Pass sibling information to each message
              onBranchChange={(messageId: string, siblingIndex) => {
                changeBranch(messageId, siblingIndex);
              }}
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
