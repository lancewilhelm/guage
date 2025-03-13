"use client";
import { useState, useRef, useEffect } from "react";
import TableListIcon from "@/components/icons/TableList";
import PlusIcon from "@/components/icons/Plus";
import { selectChatSession } from "@/utils/db/schema";
import {
  fetchChatSessions,
  createChatSession,
  deleteChatSession,
  updateChatSession,
} from "@/utils/apiHelpers";
import ChatSessionListItem from "./ChatSessionListItem";

export default function SessionsPanel({
  currentChatSessionId,
  setCurrentChatSessionId,
  isVisible,
  setIsVisible,
}: {
  currentChatSessionId: string | undefined;
  setCurrentChatSessionId: (sessionId: string) => void;
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
  const [chatSessions, setChatSessions] = useState<selectChatSession[]>([]);
  const minWidth = 250;
  const maxWidth = 600;
  const [sessionPanelWidth, setSessionPanelWidth] = useState(minWidth); // 0 for mobile, 1 for desktop
  const isResizing = useRef(false);

  // Handle panel resizing
  const startResizing = () => {
    isResizing.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      resize(e);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      isResizing.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  // Resize the panel
  const resize = (event: MouseEvent) => {
    if (!isResizing.current) return;

    let width = 0;

    width = event.clientX;

    let newWidth = width;
    if (width < minWidth / 2) {
      setIsVisible(false);
      newWidth = minWidth;
    } else {
      newWidth = Math.max(minWidth, Math.min(width, maxWidth));
    }
    setSessionPanelWidth(newWidth);
  };

  /**
   * Create a new chat session
   */
  const createSession = async () => {
    const newChatSession = await createChatSession();
    setChatSessions([newChatSession, ...chatSessions]);
    setCurrentChatSessionId(newChatSession.id);
  };

  /**
   * Fetch the chat sessions from the backend
   */
  const fetchSessions = async () => {
    const data = await fetchChatSessions();
    if (data) {
      setChatSessions(data);
    }
  };

  /**
   * Update the chat session title
   */
  const renameSession = async (sessionId: string, title: string) => {
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
  };

  /**
   * Delete a chat session
   */
  const deleteSession = async (sessionId: string) => {
    const result = await deleteChatSession(sessionId);
    if (result) {
      setChatSessions(
        chatSessions.filter((session) => session.id !== sessionId),
      );
    } else {
      console.error("Failed to delete chat session");
    }
  };

  // Fetch chat sessions when the compnent mounts
  useEffect(() => {
    fetchSessions();
  }, [currentChatSessionId]);

  return (
    <div className={`h-full ${isVisible ? "flex" : "hidden"}`}>
      <div
        className="flex justify-center p-2 overflow-hidden"
        style={{ width: sessionPanelWidth }}
      >
        <div className="flex flex-col w-full items-center gap-2">
          <div className="flex w-full items-center px-2">
            <TableListIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onMouseDown={() => setIsVisible(false)}
            />
            <div className="grow text-center">Sessions</div>
            <PlusIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onClick={createSession}
            />
          </div>
          {/* Sessions List */}
          <div className="flex flex-col w-full gap-2">
            {chatSessions.map((session) => (
              <ChatSessionListItem
                key={session.id}
                session={session}
                setCurrentChatSessionId={setCurrentChatSessionId}
                deleteHandler={deleteSession}
                renameHandler={renameSession}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex cursor-ew-resize"
        onMouseDown={(e) => {
          e.preventDefault();
          startResizing();
        }}
      >
        {/* Some trickery to create a 1px border with a wide hover range*/}
        <div className="w-[2px] bg-(--bg-color)" />
        <div className="w-[1px] bg-(--main-color)" />
        <div className="w-[2px] bg-(--bg-color)" />
      </div>
    </div>
  );
}
