import { useState, useRef, useEffect } from "react";
import DotsIcon from "@/components/Icon/Dots";
import DotsSpinnerIcon from "@/components/Icon/DotsSpinner";
import TrashCanIcon from "@/components/Icon/TrashCan";
import PencilIcon from "@/components/Icon/Pencil";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";
import ThumbtackIcon from "@/components/Icon/Thumbtack";
import ThumbtackSlashIcon from "@/components/Icon/ThumbtackSlash";
import DropDownMenu, {
  DropDownMenuButton,
  DropDownMenuItem,
  DropDownMenuList,
} from "@/components/DropDownMenu";
import { ChatItem } from "@/app/(auth)/chat/layout";

export default function ChatListItem({
  chat,
  currentChatSessionId,
  setCurrentChatSessionId,
  deleteHandler,
  renameHandler,
  pinHandler,
}: {
  chat: ChatItem;
  currentChatSessionId: string | undefined;
  setCurrentChatSessionId: (sessionId: string) => void;
  deleteHandler: (sessionId: string) => void;
  renameHandler: (sessionId: string, newTitle: string) => void;
  pinHandler: (sessionId: string, state: boolean) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    setNewTitle(chat.title);
  }, [chat.title]);

  return (
    <div
      className={`flex gap-1.5 justify-between items-center rounded-lg p-1.5 cursor-pointer ${currentChatSessionId === chat.id && "bg-(--bg-color)"}`}
      onMouseEnter={() => setIsMenuButtonVisible(true)}
      onMouseLeave={() => setIsMenuButtonVisible(false)}
      onMouseDown={() => setCurrentChatSessionId(chat.id)}
    >
      <div className="cursor-pointer hover:opacity-80 overflow-hidden">
        {isRenaming ? (
          <input
            type="text"
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (chat.title !== newTitle) {
                  renameHandler(chat.id, newTitle);
                }
                setIsRenaming(false);
              } else if (e.key === "Escape") {
                setNewTitle(chat.title);
                setIsRenaming(false);
              }
            }}
            className="border px-1 rounded w-full border-none"
          />
        ) : (
          <div className="flex gap-1.5 items-center">
            <div className="text-nowrap overflow-hidden text-ellipsis">
              {newTitle}
            </div>
            {chat.isStreaming && (
              <DotsSpinnerIcon fill="var(--text-color)" className="scale-120" />
            )}
          </div>
        )}
      </div>
      {isRenaming ? (
        <div className="flex">
          <button
            onClick={() => {
              if (chat.title !== newTitle) {
                renameHandler(chat.id, newTitle);
              }
              setIsRenaming(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 cursor-pointer"
          >
            <CheckIcon fill="var(--color-yes)" />
          </button>
          <button
            onClick={() => {
              setNewTitle(chat.title);
              setIsRenaming(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 cursor-pointer"
          >
            <XMarkIcon fill="var(--color-no)" />
          </button>
        </div>
      ) : (
        <DropDownMenu>
          <DropDownMenuButton>
            {isMenuButtonVisible ? (
              <DotsIcon fill="var(--main-color)" className="scale-125" />
            ) : (
              <DotsIcon
                fill={`${currentChatSessionId === chat.id && "bg-(--sub-color)"}`}
              />
            )}
          </DropDownMenuButton>
          <DropDownMenuList align="right">
            <DropDownMenuItem
              onClick={() => pinHandler(chat.id, chat.pinned)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-[20px_auto] items-center ">
                {chat.pinned ? (
                  <ThumbtackSlashIcon fill="var(--main-color)" />
                ) : (
                  <ThumbtackIcon fill="var(--main-color)" />
                )}
                {chat.pinned ? "Unpin" : "Pin"}
              </div>
            </DropDownMenuItem>
            <DropDownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsRenaming(true);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="grid grid-cols-[20px_auto] items-center ">
                <PencilIcon fill="var(--main-color)" />
                Rename
              </div>
            </DropDownMenuItem>
            <DropDownMenuItem
              onClick={() => deleteHandler(chat.id)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-[20px_auto] items-center text-(--error-color)">
                <TrashCanIcon
                  fill="var(--color-no)"
                  className="translate-y-[-1px]"
                />
                Trash
              </div>
            </DropDownMenuItem>
          </DropDownMenuList>
        </DropDownMenu>
      )}
    </div>
  );
}
