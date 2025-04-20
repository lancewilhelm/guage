import { type LocalMessage, dbUpdateMessage } from "~/utils/db/local";
import { useChatStore } from "~/stores/chat";
import { sendMessageToLLM } from "./sendMessageToLLM";

export async function streamAndUpdateAssistantMessage({
  chatId,
  userMessageId,
  assistantMessageId,
  history,
}: {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  history: LocalMessage[];
}) {
  const chatStore = useChatStore();
  if (!chatStore.chats[chatId]) {
    logger.error("Chat not found:", chatId);
    return;
  }

  const userMessage = chatStore.chats[chatId].messages[userMessageId];
  if (!userMessage) {
    logger.error("User message not found:", userMessageId);
    return;
  }

  const abortController = new AbortController();
  chatStore.setChatAbortController(chatId, abortController);

  try {
    await sendMessageToLLM({
      userMessage: userMessage,
      history,
      signal: abortController.signal,
      onChunk: (partialText) => {
        chatStore.updateMessage(chatId, assistantMessageId, {
          content: partialText,
        });
        dbUpdateMessage(assistantMessageId, { content: partialText });
      },
      onError: (error) => {
        chatStore.updateMessage(chatId, assistantMessageId, { error });
        dbUpdateMessage(assistantMessageId, { error });
        chatStore.setChatStreaming(chatId, false);
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
