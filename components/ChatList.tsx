"use client";
import { useState, useMemo, useRef } from "react";
import TableListIcon from "@/components/Icon/TableList";
import PlusIcon from "@/components/Icon/Plus";
import ChatListItem from "@/components/ChatListItem";
import ThumbtackIcon from "@/components/Icon/Thumbtack";
import { ChatItem } from "@/app/(auth)/chat/layout";

function ChatListGroupTitle({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center justify-center text-center text-sm font-thin text-(--text-color) mb-1">
      <span className="w-full h-[1px] bg-(--main-color) opacity-50 mx-2" />
      {title === "Pinned" && (
        <ThumbtackIcon fill="var(--main-color)" className="scale-300 mr-2" />
      )}
      <div className="flex justify-center text-nowrap text-(--sub-color)">
        {title}
      </div>
      <span className="w-full h-[1px] bg-(--main-color) opacity-50 mx-2" />
    </div>
  );
}

export default function ChatsPanel({
  chats,
  currentChatId,
  setCurrentChatIdAction,
  isVisible,
  setIsVisibleAction,
  createAction,
  deleteAction,
  renameAction,
  pinAction,
}: {
  chats: ChatItem[];
  currentChatId: string | undefined;
  setCurrentChatIdAction: (sessionId: string) => void;
  isVisible: boolean;
  setIsVisibleAction: (isVisible: boolean) => void;
  createAction: () => void;
  deleteAction: (sessionId: string) => void;
  renameAction: (sessionId: string, newName: string) => void;
  pinAction: (sessionId: string, state: boolean) => void;
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
      setIsVisibleAction(false);
      newWidth = minWidth;
    } else {
      newWidth = Math.max(minWidth, Math.min(width, maxWidth));
    }
    setSessionPanelWidth(newWidth);
  };

  // Define date boundaries
  const sortedChats: Record<string, ChatItem[]> = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    return {
      Pinned: chats.filter((chat) => chat.pinned),
      Today: chats.filter((chat) => !chat.pinned && chat.updatedAt >= today),
      Yesterday: chats.filter(
        (chat) =>
          !chat.pinned && chat.updatedAt >= yesterday && chat.updatedAt < today,
      ),
      "Last 7 Days": chats.filter(
        (chat) =>
          !chat.pinned &&
          chat.updatedAt >= lastWeek &&
          chat.updatedAt < yesterday,
      ),
      "Last 30 Days": chats.filter(
        (chat) =>
          !chat.pinned &&
          chat.updatedAt >= lastMonth &&
          chat.updatedAt < lastWeek,
      ),
      Older: chats.filter((chat) => !chat.pinned && chat.updatedAt < lastMonth),
    };
  }, [chats]);

  return (
    <div
      className={`h-full bg-(--sub-alt-color) ${isVisible ? "flex" : "hidden"}`}
    >
      <div
        className="flex justify-center p-2 overflow-hidden"
        style={{ width: sessionPanelWidth }}
      >
        <div className="flex flex-col w-full items-center gap-2">
          <div className="flex w-full items-center px-2">
            <TableListIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onMouseDown={() => setIsVisibleAction(false)}
            />
            <div className="grow text-center">Chats</div>
            <PlusIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onClick={createAction}
            />
          </div>
          <div className="w-full h-[1px] bg-(--main-color) opacity-50" />
          {/* Sessions List */}
          <div className="flex flex-col w-full gap-2">
            {Object.keys(sortedChats).map((key) => {
              return sortedChats[key].length > 0 ? (
                <div
                  key={key}
                  className="flex flex-col w-full text-center text-sm mb-2"
                >
                  <ChatListGroupTitle title={key} />
                  {sortedChats[key].map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      currentChatSessionId={currentChatId}
                      setCurrentChatSessionId={setCurrentChatIdAction}
                      deleteHandler={deleteAction}
                      renameHandler={renameAction}
                      pinHandler={pinAction}
                    />
                  ))}
                </div>
              ) : null;
            })}
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
        <div className="w-[3px] bg-(--sub-alt-color)" />
        <div className="w-[3px] bg-(--bg-color)" />
      </div>
    </div>
  );
}
