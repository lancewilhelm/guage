import { logger } from "@/utils/logger";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHightlight from "rehype-highlight";
import Markdown from "react-markdown";
import BouncingDotsIcon from "@/components/Icon/BouncingDots";
import PencilIcon from "@/components/Icon/Pencil";
import AngleRightIcon from "@/components/Icon/AngleRight";
import AngleLeftIcon from "@/components/Icon/AngleLeft";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";
import CopyIcon from "@/components/Icon/Copy";
import ThumbsUpIcon from "@/components/Icon/ThumbsUp";
import Pre from "@/components/Pre";
import { useSessionStore } from "@/store/sessionStore";
import { LocalMessage } from "@/utils/db/local";

interface ComputedVersionInfo {
  total: number;
  currentIndex: number;
  versionIds: string[];
}

const customComponents = {
  pre({ children, ...props }: React.PropsWithChildren) {
    return <Pre {...props}>{children}</Pre>;
  },
  code({ children, ...props }: React.PropsWithChildren) {
    return (
      <code className="whitespace-pre overflow-x-auto" {...props}>
        {children}
      </code>
    );
  },
};

const MessageContent = memo(
  ({ content, role }: { content: string; role: string }) =>
    role === "user" ? (
      <div className="">{content}</div>
    ) : (
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHightlight]}
        components={customComponents}
      >
        {content}
      </Markdown>
    ),
);
MessageContent.displayName = "MessageContent";

const VersionNavigation = memo(
  ({
    versionInfo,
    onBranchChange,
  }: {
    versionInfo?: ComputedVersionInfo;
    onBranchChange: (versionIndex: number) => void;
  }) => {
    const handlePrevVersion = useCallback(() => {
      if (versionInfo && versionInfo.currentIndex !== 0) {
        onBranchChange(
          (versionInfo.currentIndex - 1 + versionInfo.total) %
            versionInfo.total,
        );
      }
    }, [versionInfo, onBranchChange]);

    const handleNextVersion = useCallback(() => {
      if (versionInfo && versionInfo.currentIndex !== versionInfo.total - 1) {
        onBranchChange((versionInfo.currentIndex + 1) % versionInfo.total);
      }
    }, [versionInfo, onBranchChange]);

    // Now conditionally render, after the hooks have been called.
    if (!versionInfo || versionInfo.total <= 1) return null;

    return (
      <div className="flex items-center gap-1">
        <AngleLeftIcon
          fill="var(--color-acc)"
          className={`cursor-pointer ${
            versionInfo.currentIndex === 0 ? "opacity-50" : ""
          }`}
          onClick={handlePrevVersion}
        />
        <div className="text-[var(--color-acc)]">
          {versionInfo.currentIndex + 1} of {versionInfo.total}
        </div>
        <AngleRightIcon
          fill="var(--color-acc)"
          className={`cursor-pointer ${
            versionInfo.currentIndex === versionInfo.total - 1
              ? "opacity-50"
              : ""
          }`}
          onClick={handleNextVersion}
        />
      </div>
    );
  },
);
VersionNavigation.displayName = "VersionNavigation";

function ChatBubble({
  message,
  onEdit,
  versionInfo,
  onBranchChange,
  width,
  maxWidth,
  backgroundColor,
  showName,
}: {
  message: LocalMessage;
  onEdit: (message: LocalMessage) => void;
  versionInfo?: ComputedVersionInfo;
  onBranchChange: (versionIndex: number) => void;
  width?: string;
  maxWidth?: string;
  backgroundColor: string;
  showName: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);
  const [isButtonRowVisible, setIsButtonRowVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useSessionStore();

  const handleCopy = useCallback(() => {
    logger.debug("Copying message to clipboard");
    if (!contentRef.current) return;
    navigator.clipboard.writeText(contentRef.current.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  const interlocutorName =
    message.role === "user" ? session?.user.name || "You" : "Assistant";

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setEditedContent(message.content);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.selectionEnd =
          inputRef.current.value.length;
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }, 0);
  }, [message.content]);

  const handleSaveEdit = useCallback(() => {
    setIsEditing(false);
    if (editedContent === message.content) return;
    onEdit({ ...message, content: editedContent });
  }, [message, editedContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent(message.content);
  }, [message.content]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  useEffect(() => {
    setEditedContent(message.content);
  }, [message.content]);

  return (
    <div
      className={`flex cursor-default w-full ${
        message.role === "user" ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setIsButtonRowVisible(true)}
      onMouseLeave={() => setIsButtonRowVisible(false)}
    >
      <div
        className={`flex flex-col gap-1 ${isEditing && "w-full"} ${
          message.role === "user" ? "items-end" : "items-start"
        }`}
        style={{ width, maxWidth }}
      >
        {showName && <div className="px-1">{interlocutorName}</div>}
        {isEditing ? (
          <div
            className="flex flex-col w-full gap-2 rounded-lg p-2"
            style={{ width, maxWidth: width, backgroundColor }}
          >
            <textarea
              ref={inputRef}
              value={editedContent}
              onChange={(e) => {
                setEditedContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleTextareaKeyDown}
              className="w-full p-1 focus:outline-none"
            />
            <div className="flex gap-3 justify-end">
              <CheckIcon
                onClick={handleSaveEdit}
                fill="var(--color-yes)"
                className="cursor-pointer scale-125"
              />
              <XMarkIcon
                onClick={handleCancelEdit}
                fill="var(--color-no)"
                className="cursor-pointer scale-125"
              />
            </div>
          </div>
        ) : message.content ? (
          <div
            ref={contentRef}
            className="max-w-full flex flex-col gap-2 rounded-lg p-3"
            style={{ backgroundColor }}
          >
            <MessageContent content={editedContent} role={message.role} />
          </div>
        ) : (
          <div
            className="flex flex-col gap-2 rounded-lg p-3"
            style={{ backgroundColor }}
          >
            <BouncingDotsIcon fill="var(--color-fg0)" />
          </div>
        )}
        {!isEditing && (
          <div
            className={`flex gap-2 items-center ${
              message.role === "user"
                ? "flex-row-reverse mr-3"
                : "flex-row ml-3"
            }`}
          >
            <VersionNavigation
              versionInfo={versionInfo}
              onBranchChange={onBranchChange}
            />
            {isCopied ? (
              <ThumbsUpIcon
                fill={
                  isButtonRowVisible ? "var(--color-acc)" : "var(--color-bg0)"
                }
              />
            ) : (
              <CopyIcon
                fill={
                  isButtonRowVisible ? "var(--color-acc)" : "var(--color-bg0)"
                }
                className="cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy();
                }}
              />
            )}
            <PencilIcon
              fill={
                isButtonRowVisible ? "var(--color-acc)" : "var(--color-bg0)"
              }
              className="cursor-pointer"
              onClick={handleEditClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatBubble);
