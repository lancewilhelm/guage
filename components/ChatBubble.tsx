import { micromark } from "micromark";
import { math, mathHtml } from "micromark-extension-math";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble({ role, content }: ChatMessage) {
  return (
    <div
      className={`flex ${role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] ${role === "user" ? "items-end" : "items-start"}`}
      >
        <div className="px-1">{role}</div>
        <div
          className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full"
          dangerouslySetInnerHTML={{
            __html: micromark(content, {
              extensions: [math()],
              htmlExtensions: [mathHtml()],
            }),
          }}
        />
        {/* {content} */}
      </div>
    </div>
  );
}
