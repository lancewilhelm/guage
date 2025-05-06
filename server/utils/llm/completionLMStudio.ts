import { logger } from "~/utils/logger";
import type { LocalMessage } from "~/utils/db/local";
import { Chat } from "@lmstudio/sdk";

export async function completionLMStudio({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const lmStudio = getLMStudioClient();

  try {
    const messages: {
      role: "user" | "assistant" | "system";
      content: string;
    }[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.unshift({ role: "system", content: systemPrompt });
    const chat = Chat.from(messages);

    const lmStudioModel = await lmStudio.llm.model(model);
    const completion = await lmStudioModel.respond(chat, {
      maxTokens: 200,
    });

    return completion.content;
  } catch (error) {
    logger.error(error, "Error getiting completion from LM Studio");
    throw new Error("Internal server error");
  }
}
