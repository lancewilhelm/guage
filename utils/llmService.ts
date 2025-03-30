import { LLMProvider } from "@/utils/llm/providers/types";
import { LocalMessage } from "@/utils/db/local";
import { useChatStore } from "@/store/chatStore";
import { dbUpdateMessage } from "@/utils/db/local";

export async function streamAndUpdateAssistantMessage({
  provider,
  userMessage,
  assistantMessage,
  chatId,
  history,
}: {
  provider: LLMProvider;
  userMessage: LocalMessage;
  assistantMessage: LocalMessage;
  chatId: string;
  history: LocalMessage[];
}) {
  const chatStore = useChatStore.getState();
  const { updateMessage, updateChatMetadata, setChatAbortController } =
    chatStore;

  const abortController = new AbortController();
  setChatAbortController(chatId, abortController);

  let accumulated = "";

  try {
    for await (const chunk of provider.streamChatResponse(
      userMessage,
      history,
      chatId,
      abortController.signal,
    )) {
      accumulated += chunk;
      updateMessage(chatId, assistantMessage.id, accumulated);
      dbUpdateMessage(assistantMessage.id, { content: accumulated });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.debug("Streaming aborted");
    } else {
      console.error("LLM streaming error:", err);
    }
  } finally {
    updateChatMetadata(chatId, { isStreaming: false });
    setChatAbortController(chatId);
  }
}
