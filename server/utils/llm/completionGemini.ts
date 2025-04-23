import { logger } from "~/utils/logger";
import type { LocalMessage } from "~/utils/db/local";

export async function completionGemini({
  history,
  model,
  systemPrompt,
}: {
  history: LocalMessage[];
  model: string;
  systemPrompt: string;
}) {
  const gemini = getGeminiClient();
  console.log("history", history);

  try {
    const completion = await gemini.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: history.map((m) => m.content),
    });
    return completion.text;
  } catch (error) {
    logger.error(error, "Error getiting completion from Gemini");
    throw new Error("Internal server error");
  }
}
