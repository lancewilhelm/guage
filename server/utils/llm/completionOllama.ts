import { logger } from "~/utils/logger";
import type { LocalMessage } from "~/utils/db/local";

interface OllamaMesageParam {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export async function completionOllama({
  history,
  model,
  url,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  url?: string;
  systemPrompt: string;
}) {
  try {
    const formattedMessages: OllamaMesageParam[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    formattedMessages.unshift({ role: "system", content: systemPrompt });

    const completion = await $fetch<OllamaResponse>(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        stream: false,
      }),
    });

    const content = completion.message.content;
    return content;
  } catch (error) {
    logger.error(error, "Error getting Ollama completion");
    throw new Error("Internal server error");
  }
}
