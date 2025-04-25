import type { LocalMessage } from "~/utils/db/local";
import { parseSSEChunk } from "~/utils/chat";

type SendMessageOptions = {
  history: LocalMessage[];
  provider?: "openai" | "ollama"; // extendable
  onChunk?: (text: string) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
};

export async function sendMessageToLLM({
  history,
  onChunk,
  onError,
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
      history,
      model: { ...userSettingsStore.settings.model },
      systemPrompt: getSystemPrompt(),
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
      } else if (event.eventType === "error") {
        onError?.(event.data);
      }
    }
  }

  return accumulated;
}

function getSystemPrompt() {
  const usersettingsStore = useUserSettingsStore();
  if (!usersettingsStore.settings.currentSystemPrompt) return "";

  if (usersettingsStore.settings.currentSystemPrompt === "default") {
    return usersettingsStore.settings.defaultSystemPrompt;
  } else {
    return usersettingsStore.settings.systemPrompts[
      usersettingsStore.settings.currentSystemPrompt
    ];
  }
}
