import { micromark } from "micromark";
import { math, mathHtml } from "micromark-extension-math";
import WindToySpinner from "@/components/Icon/WindToy";
import { useSession } from "@/context/session-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble({ role, content }: ChatMessage) {
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

  return (
    <div
      className={`flex ${role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] ${role === "user" ? "items-end" : "items-start"}`}
      >
        <div className="px-1">{handleInterlocutorName()}</div>
        {content !== "" ? (
          <div
            className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full"
            dangerouslySetInnerHTML={{
              __html: micromark(content, {
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
        {/* <div className="flex flex-col gap-2 border rounded-lg p-2 overflow-hidden max-w-full"> */}
        {/*   {content} */}
        {/* </div> */}
      </div>
    </div>
  );
}
