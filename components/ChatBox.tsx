import ChatBubble from "@/components/ChatBubble";
import { DisplayMessage } from "@/app/(auth)/chat/page";

export default function ChatBox({
  messages,
  isSessionLoaded = false,
}: {
  messages: DisplayMessage[];
  isSessionLoaded?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 w-full h-full p-2 overflow-x-hidden">
      {messages.length === 0 ? (
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
        messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))
      )}
    </div>
  );
}
