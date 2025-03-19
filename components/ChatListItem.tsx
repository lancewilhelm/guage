import { useState, useRef, useEffect } from "react";
import DotsIcon from "@/components/Icon/Dots";
import TrashCanIcon from "@/components/Icon/TrashCan";
import PencilIcon from "@/components/Icon/Pencil";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";
import DropDownMenu, {
  DropDownMenuButton,
  DropDownMenuItem,
  DropDownMenuList,
} from "@/components/DropDownMenu";
import { SelectChatSession } from "@/utils/db/schema";

export default function ChatListItem({
  session,
  currentChatSessionId,
  setCurrentChatSessionId,
  deleteHandler,
  renameHandler,
}: {
  session: SelectChatSession;
  currentChatSessionId: string | undefined;
  setCurrentChatSessionId: (sessionId: string) => void;
  deleteHandler: (sessionId: string) => void;
  renameHandler: (sessionId: string, newTitle: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
    }
  }, [isRenaming]);

  return (
    <div
      className={`flex gap-1 justify-between items-center rounded-lg p-1.5 cursor-pointer ${currentChatSessionId === session.id && "bg-(--color-bg2)"}`}
      onMouseEnter={() => setIsMenuButtonVisible(true)}
      onMouseLeave={() => setIsMenuButtonVisible(false)}
      onMouseDown={() => setCurrentChatSessionId(session.id)}
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
                if (session.title !== newTitle) {
                  renameHandler(session.id, newTitle);
                }
                setIsRenaming(false);
              } else if (e.key === "Escape") {
                setNewTitle(session.title);
                setIsRenaming(false);
              }
            }}
            className="border px-1 rounded w-full"
          />
        ) : (
          <div className="text-nowrap overflow-hidden text-ellipsis">
            {session.title}
          </div>
        )}
      </div>
      {isRenaming ? (
        <div className="flex">
          <button
            onClick={() => {
              if (session.title !== newTitle) {
                renameHandler(session.id, newTitle);
              }
              setIsRenaming(false);
            }}
            className="p-1 cursor-pointer"
          >
            <CheckIcon fill="var(--color-yes)" />
          </button>
          <button
            onClick={() => {
              setNewTitle(session.title);
              setIsRenaming(false);
            }}
            className="p-1 cursor-pointer"
          >
            <XMarkIcon fill="var(--color-no)" />
          </button>
        </div>
      ) : (
        <DropDownMenu>
          <DropDownMenuButton>
            {isMenuButtonVisible ? (
              <DotsIcon fill="var(--color-acc)" />
            ) : (
              <DotsIcon
                fill={`${currentChatSessionId === session.id && "bg-(--color-bg2)"}`}
              />
            )}
          </DropDownMenuButton>
          <DropDownMenuList align="right">
            <DropDownMenuItem
              onClick={() => {
                setIsRenaming(true);
              }}
            >
              <div className="grid grid-cols-[20px_auto] items-center ">
                <PencilIcon fill="var(--color-acc)" />
                Rename
              </div>
            </DropDownMenuItem>
            <DropDownMenuItem onClick={() => deleteHandler(session.id)}>
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
