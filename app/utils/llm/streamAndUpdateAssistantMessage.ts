import { type LocalMessage, dbUpdateMessage } from "~/utils/db/local";
import { useChatStore } from "~/stores/chat";
import { sendMessageToLLM } from "./sendMessageToLLM";

export async function streamAndUpdateAssistantMessage({
  chatId,
  assistantMessageId,
  history,
}: {
  chatId: string;
  assistantMessageId: string;
  history: LocalMessage[];
}) {
  const chatStore = useChatStore();
  if (!chatStore.chats[chatId]) {
    logger.error("Chat not found:", chatId);
    return;
  }

  const abortController = new AbortController();
  chatStore.setChatAbortController(chatId, abortController);

  try {
    await sendMessageToLLM({
      history,
      signal: abortController.signal,
      onMessage: (partialText) => {
        chatStore.updateMessage(chatId, assistantMessageId, {
          content: partialText,
        });
        dbUpdateMessage(assistantMessageId, { content: partialText });
      },
      onUsage: (usage) => {
        chatStore.updateMessage(chatId, assistantMessageId, { usage });
        dbUpdateMessage(assistantMessageId, { usage });
      },
      onError: (error) => {
        chatStore.updateMessage(chatId, assistantMessageId, { error });
        dbUpdateMessage(assistantMessageId, { error });
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.debug("LLM streaming aborted");
    } else {
      chatStore.updateMessage(chatId, assistantMessageId, {
        error: `Error streaming response: ${err}`,
      });
      dbUpdateMessage(assistantMessageId, {
        error: `Error streaming response: ${err}`,
      });
    }
  } finally {
    chatStore.setChatStreaming(chatId, false);
    chatStore.setChatAbortController(chatId); // clear abort controller
  }
}
