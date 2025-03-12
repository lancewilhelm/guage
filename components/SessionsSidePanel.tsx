"use client";
import { useState, useRef, useEffect } from "react";
import TableListIcon from "@/components/icons/TableList";
import PlusIcon from "@/components/icons/Plus";
import { selectChatSession } from "@/db/schema";

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

  /*
   * Fetch the chat sessions from the backend
   */
  const fetchChatSessions = async () => {
    try {
      // setIsLoading(true);
      const response = await fetch("/api/chat/sessions");
      if (!response.ok) throw new Error("Failed to fetch chat sessions");
      const data = await response.json();
      setChatSessions(data);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    } finally {
      // setIsLoading(false);
    }
  };

  // Function to create new chat session
  const createChatSession = async () => {
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "New Chat Session",
          conversationType: "chat",
        }),
      });

      if (!response.ok) throw new Error("Failed to create chat session");

      const newChatSession = await response.json();
      setChatSessions([newChatSession, ...chatSessions]);
      setCurrentChatSessionId(newChatSession.id);
    } catch (error) {
      console.error("Error creating chat session:", error);
    }
  };

  // Fetch chat sessions when the compnent mounts
  useEffect(() => {
    fetchChatSessions();
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
              onClick={createChatSession}
            />
          </div>
          {/* Sessions List */}
          <div className="flex flex-col w-full gap-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setCurrentChatSessionId(session.id)}
                className="cursor-pointer hover:opacity-80"
              >
                {session.title}
              </div>
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
