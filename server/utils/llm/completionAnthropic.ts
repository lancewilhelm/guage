import { logger } from "~/utils/logger";
import type { LocalMessage } from "~/utils/db/local";

export async function completionAnthropic({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const anthropic = getAnthropicClient();

  try {
    const completion = await anthropic.messages.create({
      model,
      max_tokens: 200,
      system: systemPrompt,
      messages: history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });
    if (completion.content[0].type === "text") {
      return completion.content[0].text;
    } else {
      throw new Error("Invalid response from Anthropic");
    }
  } catch (error) {
    logger.error(error, "Error getiting completion from OpenAI");
    throw new Error("Internal server error");
  }
}
