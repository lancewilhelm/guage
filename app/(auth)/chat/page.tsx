"use client";
import { logger } from "@/utils/logger";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ChatBox from "@/components/ChatBox";
import InputRow, { InputRowHandle } from "@/components/InputRow";
import SessionsSidePanel from "@/components/ChatList";
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
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const pendingBranchChange = useRef<{
    messageId: string;
    siblingIndex: number;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<InputRowHandle>(null);

  // Derive the active thread from the thread state and message map
  const thread = useMemo(() => {
    if (!threadState.activePath.length) return [];
    return threadState.activePath
      .map((id) => messageMap[id])
      .filter(Boolean) as DisplayMessage[];
  }, [threadState.activePath, messageMap]);

  /**
   * Generate a new message map from messages
   */
  const generateMessageMap = useCallback(
    (messages: DisplayMessage[]): MessageMap => {
      const map: MessageMap = {};
      messages.forEach((msg) => {
        map[msg.id] = msg;
      });
      return map;
    },
    [],
  );

  /**
   * Generate thread state from the message map
   */
  const generateThreadState = useCallback(
    (messageMap: MessageMap): ThreadState => {
      const threadState: ThreadState = {
        activePath: [],
        siblingInfo: {},
      };

      // Find the root message(s)
      const rootMessages = Object.values(messageMap)
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

      return threadState;
    },
    [],
  );

  /**
   * Fetch messages from the backend
   */
  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to fetch chat messages");
      return await response.json();
    } catch (error) {
      logger.error("Error fetching chat messages:", error);
    }
  }, []);

  /**
   * Stop the stream of messages from the LLM API
   */
  const handleStopStream = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);

      if (currentChatSessionId) {
        setTimeout(async () => {
          const updatedMessages = await fetchMessages(currentChatSessionId);
          if (updatedMessages) {
            setMessages(updatedMessages);
            const newMessageMap = generateMessageMap(updatedMessages);
            setMessageMap(newMessageMap);
            setThreadState(generateThreadState(newMessageMap));
          }
        }, 500);
      }
    }
  }, [
    currentChatSessionId,
    fetchMessages,
    generateMessageMap,
    generateThreadState,
  ]);

  /**
   * Load a chat session by ID
   */
  const loadSession = useCallback(
    async (sessionId: string) => {
      setMessages([]);
      setThreadState({ activePath: [], siblingInfo: {} });
      setMessageMap({});
      setCurrentChatSessionId(sessionId);
      try {
        setIsLoading(true);
        const data = await fetchMessages(sessionId);
        if (data) {
          setMessages(data);
        }
      } catch (error) {
        logger.error("Error fetching chat messages:", error);
      } finally {
        setIsLoading(false);

        // Focus the input after loading a session
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    },
    [fetchMessages],
  );

  /**
   * Fetch the chat sessions from the backend
   */
  const fetchSessions = useCallback(async () => {
    const data = await fetchChatSessions();
    if (data) {
      setChatSessions(data);
    }
  }, []);

  /**
   * Helper function to update messages with new content
   */
  const updateMessageContent = useCallback(
    (messageId: string, content: string) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)),
      );
    },
    [],
  );

  /**
   * Helper function to update IDs from client-generated to server-generated
   */
  const updateMessageIds = useCallback(
    (originalMessage: DisplayMessage, serverMessage: DisplayMessage) => {
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
          newSiblingInfo[serverMessage.id] =
            prev.siblingInfo[originalMessage.id];
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
    },
    [],
  );

  /**
   * Core function to handle message creation and response generation
   */
  const createMessagePairAndStream = useCallback(
    async (
      newMessage: TempMessage,
      responseMessage: TempMessage,
      contextMessages: DisplayMessage[],
      isFirstResponse: boolean = false,
    ) => {
      // Update messages with the new message pair
      setMessages((prev) => [...prev, newMessage, responseMessage]);

      // Set up streaming state
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      let accumulatedResponse = "";

      const handleMessageChunk = ({ eventType, data }: SSEChunk) => {
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
          logger.error("Error streaming response:", data);
        }
      };

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
        logger.error("Error connecting to the chat API:", error);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;

        if (isFirstResponse) {
          await fetchSessions();
        }

        return responseMessage.id;
      }
    },
    [
      currentChatSessionId,
      updateMessageContent,
      updateMessageIds,
      fetchSessions,
    ],
  );

  /**
   * Handle the submission of new messages to the backend
   */
  const handleSubmit = useCallback(async () => {
    const userInput = inputRef.current?.getValue();

    if (!userInput?.trim() || isLoading || currentChatSessionId === undefined)
      return;

    inputRef.current?.clear();

    // Add the user message to the list
    let parentId: string | null = null;
    let depth = 0;
    if (threadState.activePath.length > 0) {
      const lastMessage = messageMap[threadState.activePath.slice(-1)[0]];
      if (lastMessage?.role === "assistant") {
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
  }, [
    isLoading,
    currentChatSessionId,
    threadState,
    messageMap,
    messages,
    thread,
    createMessagePairAndStream,
  ]);

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async () => {
    const newChatSession = await createChatSession();
    if (!newChatSession) {
      logger.error("Failed to create chat session");
      return;
    }

    setMessages([]);
    setThreadState({ activePath: [], siblingInfo: {} });
    setMessageMap({});
    setCurrentChatSessionId(newChatSession.id);
    setChatSessions((prev) => [newChatSession, ...prev]);

    // Focus the input after creating a new session
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  /**
   * Update the chat session title
   */
  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const updatedSession = await updateChatSession(sessionId, { title });
      if (updatedSession) {
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, title } : session,
          ),
        );
      } else {
        logger.error("Failed to update chat session");
      }
    },
    [],
  );

  /**
   * Delete a chat session
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      const result = await deleteChatSession(sessionId);
      if (result) {
        setChatSessions((prev) =>
          prev.filter((session) => session.id !== sessionId),
        );
        if (sessionId === currentChatSessionId) {
          setMessages([]);
          setThreadState({ activePath: [], siblingInfo: {} });
          setCurrentChatSessionId(undefined);
        }
      } else {
        logger.error("Failed to delete chat session");
      }
    },
    [currentChatSessionId],
  );

  /**
   * Change to a different message branch
   */
  const changeBranch = useCallback(
    (messageId: string, newSiblingIndex: number) => {
      setThreadState((prev) => {
        // Get sibling info
        const siblingInfo = prev.siblingInfo[messageId];
        if (!siblingInfo || newSiblingIndex >= siblingInfo.total) return prev;

        // Get the sibling ID to switch to
        const newSiblingId = siblingInfo.siblingIds[newSiblingIndex];

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
        if (!currentNode) return prev;

        while (currentNode.childrenIds && currentNode.childrenIds.length > 0) {
          const siblingCount = currentNode.childrenIds.length;
          const siblingIds = currentNode.childrenIds;
          const nextNodeId = currentNode.childrenIds[0];
          currentNode = messageMap[nextNodeId];
          if (!currentNode) break;

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

        return {
          activePath: newPath,
          siblingInfo: newSiblingInfo,
        };
      });
    },
    [messageMap],
  );

  /**
   * Handle message edits - create a new branch when a message is edited
   */
  const handleEditMessage = useCallback(
    async (message: DisplayMessage) => {
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
      const parentIndex = thread.findIndex(
        (msg) => msg.id === message.parentId,
      );
      let contextMessages: DisplayMessage[];

      if (parentIndex === -1) {
        // Parent not found in thread, use default logic
        contextMessages = messages;
      } else {
        // Get thread up to the parent + the edited message
        contextMessages = [...thread.slice(0, parentIndex + 1)];
      }

      // Update the sibling information with the new message
      const siblingInfo = threadState.siblingInfo[message.id];
      if (!siblingInfo) return;

      const siblingPrevTotal = siblingInfo.total;
      const siblingPrevIndex = siblingInfo.currentIndex;
      const siblingPrevIds = siblingInfo.siblingIds;
      const newSiblingIds = [...siblingPrevIds, userMessage.id];

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setThreadState((prev) => {
        return {
          activePath: [...prev.activePath, userMessage.id, assistantMessage.id],
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
    },
    [thread, messages, threadState, createMessagePairAndStream],
  );

  // Load sessions on initial render
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load the chat session when it changes
  useEffect(() => {
    if (currentChatSessionId) {
      loadSession(currentChatSessionId);
    }
  }, [currentChatSessionId, loadSession]);

  // Update message map when messages change
  useEffect(() => {
    if (!messages.length) return;
    const map = generateMessageMap(messages);
    setMessageMap(map);
  }, [messages, generateMessageMap]);

  // Initialize thread state when messageMap changes, only if it's empty
  useEffect(() => {
    if (Object.keys(messageMap).length === 0 || !currentChatSessionId) return;

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
  }, [messageMap, currentChatSessionId, threadState, generateThreadState]);

  // Handle pending branch changes after message map updates
  useEffect(() => {
    if (pendingBranchChange.current) {
      const { messageId, siblingIndex } = pendingBranchChange.current;
      changeBranch(messageId, siblingIndex);
      pendingBranchChange.current = null;
    }
  }, [messageMap, changeBranch]);

  // UI Layout and component rendering
  return (
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className="col-start-2">
        <Header
          isSessionButtonVisible={!isSessionPanelVisible}
          toggleSessionPanel={() =>
            setIsSessionPanelVisible(!isSessionPanelVisible)
          }
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
      <div className="col-start-2 row-start-2 row-span-2 h-full w-full flex flex-col overflow-hidden">
        <div className="flex flex-grow overflow-y-auto chat-container">
          <div className="mx-auto w-full max-w-[1000px] px-5">
            <ChatBox
              thread={thread}
              threadState={threadState}
              isSessionLoaded={!!currentChatSessionId}
              onMessageEdit={handleEditMessage}
              onBranchChange={changeBranch}
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1000px]">
          <InputRow
            ref={inputRef}
            submitHandler={handleSubmit}
            stopHandler={handleStopStream}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
