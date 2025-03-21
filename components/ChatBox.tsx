import ChatBubble from "@/components/ChatBubble";
import { useChatStore } from "@/store/chatStore";
import { LocalMessage } from "@/utils/db/localDb";

interface ChatBoxProps {
  isSessionLoaded?: boolean;
  onMessageEdit: (message: LocalMessage) => void;
  onBranchChange: (messageId: string, versionIndex: number) => void;
  userBubbleWidth?: string;
  userBubbleMaxWidth?: string;
  assistantBubbleWidth?: string;
  assistantBubbleMaxWidth?: string;
  userBubbleBg?: string;
  assistantBubbleBg?: string;
  showNames?: boolean;
}

interface ComputedVersionInfo {
  total: number;
  currentIndex: number;
  versionIds: string[];
}

/**
 * Compute version info for a given message based on its parent's childrenIds.
 * Returns undefined if the message is a root (or if parent's childrenIds is not available).
 */
function computeVersionInfo(
  message: LocalMessage,
  messages: Record<string, LocalMessage>,
): ComputedVersionInfo | undefined {
  if (message.parentId === null) {
    const rootMessages = Object.values(messages).filter(
      (msg) => msg.parentId === null,
    );
    const rootIndex = rootMessages.findIndex((msg) => msg.id === message.id);
    return {
      total: rootMessages.length,
      currentIndex: rootIndex,
      versionIds: rootMessages.map((msg) => msg.id),
    };
  } else {
    const parent = messages[message.parentId];
    if (!parent || !parent.childrenIds) return undefined;
    const versions = parent.childrenIds;
    const currentIndex = versions.indexOf(message.id);
    if (currentIndex === -1) return undefined;
    return { total: versions.length, currentIndex, versionIds: versions };
  }
}

export default function ChatBox({
  isSessionLoaded = false,
  onMessageEdit,
  onBranchChange,
  userBubbleWidth,
  userBubbleMaxWidth = "75%",
  assistantBubbleWidth = "100%",
  assistantBubbleMaxWidth,
  userBubbleBg = "var(--color-bg2)",
  assistantBubbleBg = "var(--color-bg0)",
  showNames = false,
}: ChatBoxProps) {
  const currentSessionId = useChatStore((state) => state.currentChatId);
  const session = useChatStore((state) =>
    currentSessionId ? state.chats[currentSessionId] : undefined,
  );
  const activeThread = session
    ? (session.activeBranch
        .map((id) => session.messages[id])
        .filter(Boolean) as LocalMessage[])
    : [];

  return (
    <div
      className={`flex flex-col gap-2 w-full p-2 pb-15 ${
        activeThread.length === 0 || !isSessionLoaded ? "h-full" : ""
      }`}
    >
      {activeThread.length === 0 ? (
        <div className="flex flex-col grow text-center justify-center">
          <div className="text-3xl">
            {isSessionLoaded ? "No messages" : "No session loaded"}
          </div>
          <div className="italic">
            {isSessionLoaded
              ? "Send your first message in the input box below"
              : "Load a session in the panel on the left"}
          </div>
        </div>
      ) : (
        activeThread.map((message) => {
          const versionInfo = computeVersionInfo(message, session!.messages);
          return (
            <ChatBubble
              key={message.id}
              message={message}
              onEdit={onMessageEdit}
              versionInfo={versionInfo}
              onBranchChange={(versionIndex) =>
                onBranchChange(message.id, versionIndex)
              }
              width={
                message.role === "user" ? userBubbleWidth : assistantBubbleWidth
              }
              maxWidth={
                message.role === "user"
                  ? userBubbleMaxWidth
                  : assistantBubbleMaxWidth
              }
              backgroundColor={
                message.role === "user" ? userBubbleBg : assistantBubbleBg
              }
              showName={showNames}
            />
          );
        })
      )}
    </div>
  );
}
