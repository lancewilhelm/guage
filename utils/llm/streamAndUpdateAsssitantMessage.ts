import { LocalMessage, dbUpdateMessage } from "@/utils/db/local";
import { useChatStore } from "@/store/chatStore";
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
  const chatStore = useChatStore.getState();
  const { updateMessage, updateChatMetadata, setChatAbortController } =
    chatStore;

  const abortController = new AbortController();
  setChatAbortController(chatId, abortController);

  try {
    await sendMessageToLLM({
      chatId,
      userMessage,
      history,
      signal: abortController.signal,
      onChunk: (partialText) => {
        updateMessage(chatId, assistantMessage.id, partialText);
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
    updateChatMetadata(chatId, { isStreaming: false });
    setChatAbortController(chatId); // clear abort controller
  }
}
