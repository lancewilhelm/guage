import { type LocalMessage, dbUpdateMessage } from "@/utils/db/local";
import { useChatStore } from "@/stores/chat";
import { sendMessageToLLM } from "./sendMessageToLLM";

export async function streamAndUpdateAssistantMessage({
  chatId,
  userMessage,
  assistantMessage,
  history,
}: {
  chatId: string;
  userMessage: LocalMessage;
  assistantMessage: LocalMessage;
  history: LocalMessage[];
}) {
  const chatStore = useChatStore();

  const abortController = new AbortController();
  chatStore.setChatAbortController(chatId, abortController);

  try {
    await sendMessageToLLM({
      chatId,
      userMessage,
      history,
      signal: abortController.signal,
      onChunk: (partialText) => {
        chatStore.updateMessage(chatId, assistantMessage.id, partialText);
        dbUpdateMessage(assistantMessage.id, { content: partialText });
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.debug("LLM streaming aborted");
    } else {
      console.error("LLM streaming error:", err);
    }
  } finally {
    chatStore.setChatStreaming(chatId, false);
    chatStore.setChatAbortController(chatId); // clear abort controller
  }
}
