import type { LocalMessage } from "~/utils/db/local";
import { parseSSEChunk } from "~/utils/chat";

type SendMessageOptions = {
  chatId: string;
  userMessage: LocalMessage;
  history: LocalMessage[];
  provider?: "openai" | "ollama"; // extendable
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
};

export async function sendMessageToLLM({
  chatId,
  userMessage,
  history,
  onChunk,
  signal,
}: SendMessageOptions): Promise<string> {
  const userSettingsStore = useUserSettingsStore();

  if (!userSettingsStore.settings.model) {
    throw new Error("Model is not set");
  }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      userMessage,
      history,
      model: { ...userSettingsStore.settings.model },
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to LLM provider");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = parseSSEChunk(chunk);
    for (const event of events) {
      if (event.eventType === "messageChunk") {
        const piece = JSON.parse(event.data);
        accumulated += piece;
        onChunk?.(accumulated); // live update
      }
    }
  }

  return accumulated;
}
