import ChatBubble from "@/components/ChatBubble";
import { DisplayMessage } from "@/app/(auth)/chat/page";
import { ThreadState } from "@/app/(auth)/chat/page";

export default function ChatBox({
  thread,
  threadState,
  isSessionLoaded = false,
  onMessageEdit,
  onBranchChange,
}: {
  thread: DisplayMessage[];
  threadState: ThreadState;
  isSessionLoaded?: boolean;
  onMessageEdit: (message: DisplayMessage) => void;
  onBranchChange: (messageId: string, siblingIndex: number) => void;
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
            siblingInfo={threadState.siblingInfo[message.id]}
            onBranchChange={(siblingIndex) =>
              onBranchChange(message.id, siblingIndex)
            }
          />
        ))
      )}
    </div>
  );
}
