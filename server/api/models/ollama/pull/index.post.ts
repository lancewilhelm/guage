import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/ollama-pull");

  // Auth
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/ollama-pull: Unauthorized");
    setResponseStatus(event, 401);
    return { message: "Unauthorized" };
  }

  // Get POST body
  const { url, model }: { url: string; model: string } = await readBody(event);

  if (!model || !url) {
    logger.error(
      "POST /api/ollama-pull: Invalid request: No model and/or url specified",
    );
    setResponseStatus(event, 400);
    return { message: "Invalid request: No model and/or url specified" };
  }

  // Create streaming ReadableStream
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(`${url}/api/pull`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, stream: true }),
        });
        if (!response.ok || !response.body) {
          logger.error(response, "Failed to connect to Ollama /api/pull");
          throw new Error("Failed to stream from Ollama");
        }

        const reader = response.body.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          buffer += text;

          // Handle chunk lines (many progress chunks newline separated)
          const lines = buffer.split("\n");
          // Keep last (possibly incomplete) line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Just forward each JSON line as an SSE event
            controller.enqueue(
              encoder.encode(`event: statusChunk\ndata: ${trimmed}\n\n`),
            );
          }
        }

        // Flush remainder if present (optional)
        if (buffer.trim()) {
          controller.enqueue(
            encoder.encode(`event: statusChunk\ndata: ${buffer.trim()}\n\n`),
          );
        }

        controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      } catch (error) {
        logger.error(error, "Ollama model pull error");
        controller.enqueue(
          encoder.encode("event: error\ndata: Error streaming Ollama pull\n\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  setHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
  });

  return sendStream(event, stream);
});
