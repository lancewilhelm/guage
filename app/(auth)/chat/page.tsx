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

// Represents a node in the message tree
export interface MessageNode {
  message: DisplayMessage;
  children: string[];
}

export type MessageMap = Record<string, MessageNode>;

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive the active thread from the thread state and message map
  const thread = useMemo(() => {
    return threadState.activePath
      .map((id) => messageMap[id]?.message)
      .filter(Boolean) as DisplayMessage[];
  }, [threadState.activePath, messageMap]);

  // Rebuild the message map when messages change
  useEffect(() => {
    const map: MessageMap = {};

    // First pass: create message nodes
    messages.forEach((msg) => {
      map[msg.id] = { message: msg, children: [] };
    });

    // Second pass: populate children arrays
    messages.forEach((msg) => {
      if (msg.parentId && map[msg.parentId]) {
        map[msg.parentId].children.push(msg.id);
      }
    });

    logger.debug("Rebuilding message map", {
      map,
    });
    setMessageMap(map);
  }, [messages]);

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

    logger.debug("Created message pair", {
      userMessageId: newMessage.id,
      assistantMessageId: responseMessage.id,
      depth: newMessage.depth,
    });

    let accumulatedResponse = "";

    function handleMessageChunk({ eventType, data }: SSEChunk) {
      if (eventType === "messageChunk") {
        accumulatedResponse += data;
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

    logger.debug("Streaming response", {
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
      logger.debug("Stream completed", {
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
    logger.debug("Updating message IDs", {
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
  }

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

    // Clear input field
    setUserInput("");

    // Before adding messages, manually update the thread state to ensure this stays in the active path
    if (parentId) {
      // Add this new message as a child of the parent and make sure it's the selected one
      setThreadState((prev) => {
        const parentNode = messageMap[parentId];
        if (!parentNode) return prev;

        // Calculate what the child index will be (it will be appended to the array)
        const newChildIndex = parentNode.children.length;

        // Deep copy the current state
        return { ...prev };
      });
    }

    // Determine if this is the first response
    const isFirstResponse =
      messages.filter((msg) => msg.role === "assistant").length === 0;

    // Create message pair and stream response
    await createMessagePairAndStream(
      userMessage,
      assistantMessage,
      thread.length > 0 ? [...thread, userMessage] : [userMessage],
      isFirstResponse,
    );

    // After the response is complete, make sure this new path remains selected
    // This is important because the messageMap rebuilds when messages change
    setTimeout(() => {
      if (parentId) {
        // Find index of the new message in the parent's children
        const parentNode = messageMap[parentId];
        if (parentNode) {
          const childIndex = parentNode.children.findIndex(
            (id) => id === userMessageId,
          );
          if (childIndex !== -1) {
            // Select this branch to ensure it remains active
            changeBranch(parentId, childIndex);
          }
        }
      }
    }, 0);
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
        setCurrentChatSessionId(undefined);
      }
    } else {
      console.error("Failed to delete chat session");
    }
  }

  function initializeThreadState(
    messageMap: MessageMap,
    previousState?: ThreadState,
  ): ThreadState {
    const threadState: ThreadState = {
      activePath: [],
      siblingInfo: {},
    };

    // Find the root message(s)
    const rootMessages = Object.values(messageMap)
      .map((node) => node.message)
      .filter((msg) => msg.parentId === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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
      currentNode = messageMap[currentNode.childrenIds[0]].message;

      // Add sibling information for this parent
      threadState.siblingInfo[currentNode.id] = {
        total: siblingCount,
        currentIndex: 0,
        siblingIds: [...siblingIds],
      };
      threadState.activePath.push(currentNode.id);
    }

    logger.debug("Initialized thread state", threadState);
    return threadState;
  }

  function changeBranch(messageId: string, newSiblingIndex: number) {
    setThreadState((prev) => {
      // Get sibling info
      const siblingInfo = prev.siblingInfo[messageId];
      if (!siblingInfo || newSiblingIndex >= siblingInfo.total) return prev;

      // Get the sibling ID to switch to
      const newSiblingId = siblingInfo.siblingIds[newSiblingIndex];

      logger.debug("Selecting branch", {
        messageId,
        newSiblingIndex,
        newSiblingId,
      });

      // Create new sibling info with updated index
      const newSiblingInfo = {
        ...prev.siblingInfo,
        [newSiblingId]: {
          ...siblingInfo,
          currentIndex: newSiblingIndex,
        },
      };

      // Determine where in the path to make the change
      const messageIndex = messageId ? prev.activePath.indexOf(messageId) : -1;
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
      let currentNode = messageMap[newSiblingId].message;

      while (currentNode.childrenIds && currentNode.childrenIds.length > 0) {
        const siblingCount = currentNode.childrenIds.length;
        const siblingIds = currentNode.childrenIds;
        currentNode = messageMap[currentNode.childrenIds[0]].message;

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

      logger.debug("New thread", { newPath, newSiblingInfo });
      return {
        activePath: newPath,
        siblingInfo: newSiblingInfo,
      };
    });
  }

  // Handle message edits - create a new branch when a message is edited
  async function handleEditMessage(message: DisplayMessage) {
    logger.debug("Handling message edit", { messageId: message.id });

    if (!currentChatSessionId) return;

    // Find the parent of this message
    const parentId = message.parentId;
    if (!parentId) {
      logger.error("Cannot edit message with no parent");
      return;
    }

    // Generate new UUIDs for the edited message and its response
    const editedMessageId = uuidv4();
    const responseMessageId = uuidv4();

    // Create the edited message as a new branch
    const editedMessage: TempMessage = {
      role: message.role,
      content: message.content,
      parentId: parentId,
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
    const parentIndex = thread.findIndex((msg) => msg.id === parentId);
    let contextMessages: DisplayMessage[];

    if (parentIndex === -1) {
      // Parent not found in thread, use default logic
      contextMessages = messages;
    } else {
      // Get thread up to the parent + the edited message
      contextMessages = [...thread.slice(0, parentIndex + 1)];
    }

    // Create message pair and stream response
    await createMessagePairAndStream(
      editedMessage,
      assistantMessage,
      [...contextMessages, editedMessage],
      false,
    );

    // After streaming completes, update the thread state to select the new branch
    setTimeout(() => {
      if (parentId) {
        // Find the index of the edited message in the parent's children
        const parentNode = messageMap[parentId];
        if (parentNode) {
          const childIndex = parentNode.children.findIndex(
            (id) => id === editedMessageId,
          );
          if (childIndex !== -1) {
            // Select the new branch
            changeBranch(parentId, childIndex);
          }
        }
      }
    }, 0);
  }

  // Initialize thread state when messageMap changes
  useEffect(() => {
    setThreadState((prev) => initializeThreadState(messageMap, prev));
  }, [messageMap]);

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
              threadState={threadState}
              isSessionLoaded={!!currentChatSessionId}
              onMessageEdit={handleEditMessage}
              // Pass sibling information to each message
              onBranchChange={(messageId: string, siblingIndex) => {
                logger.debug("Branch change", { messageId, siblingIndex });
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
