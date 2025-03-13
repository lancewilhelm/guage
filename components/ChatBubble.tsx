import { micromark } from "micromark";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble({ role, content }: ChatMessage) {
  return (
    <div
      className={`flex ${role === "user" ? "flex-row" : "flex-row-reverse"}`}
    >
      <div className="grow" />
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] ${role === "user" ? "items-end" : "items-start"}`}
      >
        <div>{role}</div>
        <div
          className="flex flex-col gap-2 border rounded-lg p-2"
          dangerouslySetInnerHTML={{ __html: micromark(content) }}
        />
      </div>
    </div>
  );
}
