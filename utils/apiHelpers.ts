import { logger } from "@/utils/logger";
import { LocalMessage } from "./db/localDb";

/**
 * Generate a title from the assistant's response
 */
export async function generateChatTitle(userMessage: LocalMessage) {
  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage,
      }),
    });

    if (!response.ok) throw new Error("Failed to generate title");

    const title = await response.json();
    return title;
  } catch (error) {
    logger.error("Error generating title:", error);
    return null;
  }
}

export interface SSEChunk {
  eventType: string;
  data: string;
}

export function parseSSEChunk(chunk: string): SSEChunk[] {
  const events = chunk.split("\n\n");
  const parsedEvents: SSEChunk[] = [];
  for (const event of events) {
    const lines = event.split("\n");
    const eventType = lines[0]?.replace("event: ", "");
    const data = lines[1]?.replace("data: ", "");
    parsedEvents.push({ eventType, data });
  }
  return parsedEvents;
}
