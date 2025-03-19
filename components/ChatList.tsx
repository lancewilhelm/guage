"use client";
import { useState, useRef } from "react";
import TableListIcon from "@/components/Icon/TableList";
import PlusIcon from "@/components/Icon/Plus";
import ChatListItem from "./ChatListItem";
import { SelectChatSession } from "@/utils/db/schema";

export default function SessionsPanel({
  chatSessions,
  currentChatSessionId,
  setCurrentChatSessionId,
  isVisible,
  setIsVisible,
  createHandler,
  deleteHandler,
  renameHandler,
}: {
  chatSessions: SelectChatSession[];
  currentChatSessionId: string | undefined;
  setCurrentChatSessionId: (sessionId: string) => void;
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  createHandler: () => void;
  deleteHandler: (sessionId: string) => void;
  renameHandler: (sessionId: string, newName: string) => void;
}) {
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

  return (
    <div className={`h-full bg-(--color-bg1) ${isVisible ? "flex" : "hidden"}`}>
      <div
        className="flex justify-center p-2 overflow-hidden"
        style={{ width: sessionPanelWidth }}
      >
        <div className="flex flex-col w-full items-center gap-2">
          <div className="flex w-full items-center px-2">
            <TableListIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onMouseDown={() => setIsVisible(false)}
            />
            <div className="grow text-center">Chats</div>
            <PlusIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onClick={createHandler}
            />
          </div>
          <div className="w-full h-[1px] bg-(--color-bg2)" />
          {/* Sessions List */}
          <div className="flex flex-col w-full gap-2">
            {chatSessions.map((session) => (
              <ChatListItem
                key={session.id}
                session={session}
                currentChatSessionId={currentChatSessionId}
                setCurrentChatSessionId={setCurrentChatSessionId}
                deleteHandler={deleteHandler}
                renameHandler={renameHandler}
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
        <div className="w-[3px] bg-(--color-bg1)" />
        <div className="w-[3px] bg-(--color-bg0)" />
      </div>
    </div>
  );
}
