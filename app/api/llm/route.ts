import { logger } from "@/utils/logger";
import { getSession } from "@/utils/auth";
import { streamOpenAI } from "@/utils/llm/server/streamOpenAi";
import { streamOllama } from "@/utils/llm/server/streamOllama";

export async function POST(req: Request) {
  logger.info("POST /api/llm");

  const session = await getSession();
  if (!session) {
    logger.error("Unauthorized access attempt to /api/llm");
    return new Response("Unauthorized", { status: 401 });
  }

  const { history, userMessage, model } = await req.json();

  if (!model) {
    logger.error("Invalid request: No provider specified");
    return new Response("Provider is required", { status: 400 });
  }

  if (!history || !Array.isArray(history) || !userMessage) {
    logger.error("Invalid request: messages are required");
    return new Response("Invalid request: messages are required", {
      status: 400,
    });
  }

  try {
    let stream: ReadableStream;

    switch (model.provider) {
      case "openai":
        stream = await streamOpenAI({
          history,
          userMessage,
          model: model.name,
        });
        break;
      case "ollama":
        stream = await streamOllama({
          history,
          userMessage,
          model: model.name,
        });
        break;
      default:
        return new Response("Unknown provider", { status: 400 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    logger.error(err, "Error streaming response");
    return new Response("Internal server error", { status: 500 });
  }
}
