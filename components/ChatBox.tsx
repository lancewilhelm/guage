import ChatBubble from "@/components/ChatBubble";
import { DisplayMessage } from "@/app/(auth)/chat/page";
import { ThreadState } from "@/app/(auth)/chat/page";

export default function ChatBox({
  thread,
  threadState,
  isSessionLoaded = false,
  onMessageEdit,
  onBranchChange,
  userBubbleWidth,
  userBubbleMaxWidth = "75%",
  assistantBubbleWidth = "100%",
  assistantBubbleMaxWidth,
  userBubbleBg = "var(--color-bg2)",
  assistantBubbleBg = "var(--color-bg2)",
  showNames = false,
}: {
  thread: DisplayMessage[];
  threadState: ThreadState;
  isSessionLoaded?: boolean;
  onMessageEdit: (message: DisplayMessage) => void;
  onBranchChange: (messageId: string, versionIndex: number) => void;
  userBubbleWidth?: string;
  userBubbleMaxWidth?: string;
  assistantBubbleWidth?: string;
  assistantBubbleMaxWidth?: string;
  userBubbleBg?: string;
  assistantBubbleBg?: string;
  showNames?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 w-full p-2 ${(thread.length === 0 || !isSessionLoaded) && "h-full"}`}
    >
      {thread.length === 0 ? (
        <div className="flex flex-col grow text-center text-(--color-bg2) justify-center">
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
        thread.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onEdit={onMessageEdit}
            versionInfo={threadState.versionInfo[message.id]}
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
        ))
      )}
    </div>
  );
}
