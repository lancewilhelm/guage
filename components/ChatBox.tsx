import ChatBubble from "@/components/ChatBubble";
import { DisplayMessage } from "@/app/(auth)/chat/page";

export default function ChatBox({
  thread,
  threadIndices,
  threadMessageCounts,
  isSessionLoaded = false,
  onMessageEdit,
}: {
  thread: DisplayMessage[];
  threadIndices: { [key: number]: number };
  threadMessageCounts: { [key: number]: number };
  isSessionLoaded?: boolean;
  onMessageEdit: (message: DisplayMessage) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full h-full p-2 overflow-x-hidden">
      {thread.length === 0 ? (
        <div className="flex flex-col grow text-center text-(--sub-color) justify-center">
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
        thread.map((message, index) => (
          <ChatBubble
            key={index}
            message={message}
            index={
              message.depth !== undefined ? threadIndices[message.depth] : 0
            }
            count={
              message.depth !== undefined
                ? threadMessageCounts[message.depth]
                : 0
            }
            onEdit={onMessageEdit}
          />
        ))
      )}
    </div>
  );
}
