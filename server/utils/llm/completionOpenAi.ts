import { logger } from "~/utils/logger";
import type { OpenAI } from "openai";
import type { LocalMessage } from "~/utils/db/local";

export async function completionOpenAI({
  history,
  userMessage,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  userMessage: LocalMessage;
  model: string;
  systemPrompt: string;
}) {
  const openai = getOpenAIClient();

  try {
    const messages = history.concat([userMessage]);
    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    formattedMessages.unshift({ role: "system", content: systemPrompt });
    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      messages: formattedMessages,
      model,
    };

    const completion = await openai.chat.completions.create(params);
    const content = completion.choices[0].message.content;
    return content;
  } catch (error) {
    logger.error(error, "Error getiting completion from OpenAI");
    throw new Error("Internal server error");
  }
}
