import { useState, useRef } from "react";
import { micromark } from "micromark";
import { math, mathHtml } from "micromark-extension-math";
import WindToySpinner from "@/components/Icon/WindToy";
import PencilIcon from "@/components/Icon/Pencil";
import AngleRightIcon from "@/components/Icon/AngleRight";
import AngleLeftIcon from "@/components/Icon/AngleLeft";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";
import { useSession } from "@/context/session-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble({ role, content }: ChatMessage) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useSession();

  function handleInterlocutorName() {
    if (role === "user") {
      if (session?.user.name) {
        return session.user.name;
      }
      return "You";
    }
    return "Assistant";
  }

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContent(content);
    // Focus the textarea after it renders
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    // Here you would typically update the content in your chat context/state
    // For now we'll just use local state
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  return (
    <div
      className={`flex ${role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] ${role === "user" ? "items-end" : "items-start"}`}
      >
        <div className="px-1">{handleInterlocutorName()}</div>
        {isEditing ? (
          <div className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full w-full">
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
              className="min-h-[50px] w-screen p-1 focus:outline-none resize-y"
            />
            <div
              className={`flex gap-2 ${role === "user" ? "justify-end" : "justify-start"}`}
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
        ) : content !== "" ? (
          <div
            className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full"
            dangerouslySetInnerHTML={{
              __html: micromark(editedContent, {
                extensions: [math()],
                htmlExtensions: [mathHtml()],
              }),
            }}
          />
        ) : (
          <div className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full">
            <WindToySpinner fill="var(--main-color)" />
          </div>
        )}

        {/* Buttons */}
        {!isEditing && (
          <div
            className={`flex gap-2 items-center ${role === "user" ? "flex-row-reverse mr-1" : "flex-row ml-1"}`}
          >
            <PencilIcon
              fill="var(--main-color)"
              className="cursor-pointer"
              onClick={handleEditClick}
            />
            <div className="flex items-center gap-1">
              <AngleLeftIcon
                fill="var(--main-color)"
                className="cursor-pointer"
              />
              <div className="text-(--main-color)">1 of 2</div>
              <AngleRightIcon
                fill="var(--main-color)"
                className="cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
