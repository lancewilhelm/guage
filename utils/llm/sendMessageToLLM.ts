import type { LocalMessage } from "@/utils/db/local";
import { parseSSEChunk } from "@/utils/chat";
// import { useUserSettingsStore } from "@/stores/userSettings";

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
  // const userSettings = useUserSettingsStore.getState().settings;
  const userSettings = {
    selectedModel: {
      name: "gpt-4o-mini",
      provider: "openai",
    },
  }; // Mocked for demonstration
  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      userMessage,
      history,
      model: userSettings.selectedModel,
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
