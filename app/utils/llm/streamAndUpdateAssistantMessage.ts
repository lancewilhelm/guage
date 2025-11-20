import type { LocalMessage } from "~/utils/db/local";
import { apiUpdateMessage } from "~/utils/api/chat";
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
        apiUpdateMessage(assistantMessageId, { content: partialText }).catch(
          (err) => {
            logger.error(
              "Failed to update message content during streaming:",
              err,
            );
          },
        );
      },
      onUsage: (usage) => {
        chatStore.updateMessage(chatId, assistantMessageId, { usage });
        apiUpdateMessage(assistantMessageId, { usage }).catch((err) => {
          logger.error("Failed to update message usage during streaming:", err);
        });
      },
      onError: (error) => {
        chatStore.updateMessage(chatId, assistantMessageId, { error });
        apiUpdateMessage(assistantMessageId, { error }).catch((err) => {
          logger.error("Failed to update message error during streaming:", err);
        });
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.debug("LLM streaming aborted");
    } else {
      chatStore.updateMessage(chatId, assistantMessageId, {
        error: `Error streaming response: ${err}`,
      });
      apiUpdateMessage(assistantMessageId, {
        error: `Error streaming response: ${err}`,
      }).catch((updateErr) => {
        logger.error("Failed to update message error:", updateErr);
      });
    }
  } finally {
    chatStore.setChatStreaming(chatId, false);
    chatStore.setChatAbortController(chatId); // clear abort controller
  }
}
