import { logger } from "@/utils/logger";
import { useState, useRef, useEffect } from "react";
import { micromark } from "micromark";
import { math, mathHtml } from "micromark-extension-math";
import BouncingDotsIcon from "@/components/Icon/BouncingDots";
import PencilIcon from "@/components/Icon/Pencil";
import AngleRightIcon from "@/components/Icon/AngleRight";
import AngleLeftIcon from "@/components/Icon/AngleLeft";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";
import CopyIcon from "@/components/Icon/Copy";
import ThumbsUpIcon from "@/components/Icon/ThumbsUp";
import { useSession } from "@/context/session-context";
import { DisplayMessage } from "@/app/(auth)/chat/page";

interface SiblingInfo {
  total: number; // Total siblings at this level
  currentIndex: number; // Current index among siblings
  siblingIds: string[]; // Ids of all siblings
}

export default function ChatBubble({
  message,
  onEdit,
  siblingInfo,
  onBranchChange,
}: {
  message: DisplayMessage;
  onEdit: (message: DisplayMessage) => void;
  siblingInfo: SiblingInfo;
  onBranchChange: (siblingIndex: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    message.content ? message.content : "",
  );
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useSession();

  function handleCopy() {
    logger.debug("Copying message to clipboard");
    if (!contentRef.current) return;
    navigator.clipboard.writeText(contentRef.current.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  function handleInterlocutorName() {
    if (message.role === "user") {
      if (session?.user.name) {
        return session.user.name;
      }
      return "You";
    }
    return "Assistant";
  }

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContent(message.content);
    // Focus the textarea after it renders
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onEdit({ ...message, content: editedContent });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  useEffect(() => {
    setEditedContent(message.content);
  }, [message.content]);

  return (
    <div
      className={`flex cursor-default ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] w-full ${message.role === "user" ? "items-end" : "items-start"}`}
      >
        <div className="px-1">{handleInterlocutorName()}</div>
        {isEditing ? (
          <div className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden w-full max-w-full">
            <textarea
              ref={inputRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              className="w-full min-h-[50px] p-1 focus:outline-none resize-y"
            />
            <div
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <CheckIcon
                onClick={handleSaveEdit}
                fill="var(--accept-color)"
                className="cursor-pointer"
              />
              <XMarkIcon
                onClick={handleCancelEdit}
                fill="var(--cancel-color)"
                className="cursor-pointer"
              />
            </div>
          </div>
        ) : message.content !== "" ? (
          <div
            ref={contentRef}
            className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full"
            dangerouslySetInnerHTML={{
              __html: micromark(message.content, {
                extensions: [math()],
                htmlExtensions: [mathHtml()],
              }),
            }}
          />
        ) : (
          <div className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full">
            <BouncingDotsIcon fill="var(--main-color)" />
          </div>
        )}

        {/* Buttons */}
        {!isEditing && (
          <div
            className={`flex gap-2 items-center ${message.role === "user" ? "flex-row-reverse mr-1" : "flex-row ml-1"}`}
          >
            {isCopied ? (
              <ThumbsUpIcon fill="var(--main-color)" />
            ) : (
              <CopyIcon
                fill="var(--main-color)"
                className="cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy();
                }}
              />
            )}
            <PencilIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onClick={handleEditClick}
            />
            {siblingInfo && siblingInfo.total > 1 && (
              <div className="flex items-center gap-1">
                <AngleLeftIcon
                  fill="var(--main-color)"
                  className={`cursor-pointer ${siblingInfo.currentIndex === 0 ? "opacity-50" : ""}`}
                  onClick={() =>
                    siblingInfo.currentIndex !== 0 &&
                    onBranchChange(
                      (siblingInfo.currentIndex - 1 + siblingInfo.total) %
                        siblingInfo.total,
                    )
                  }
                />
                <div className="text-[var(--main-color)]">
                  {siblingInfo.currentIndex + 1} of {siblingInfo.total}
                </div>
                <AngleRightIcon
                  fill="var(--main-color)"
                  className={`cursor-pointer ${siblingInfo.currentIndex === siblingInfo.total - 1 ? "opacity-50" : ""}`}
                  onClick={() =>
                    siblingInfo.currentIndex !== siblingInfo.total - 1 &&
                    onBranchChange(
                      (siblingInfo.currentIndex + 1) % siblingInfo.total,
                    )
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
