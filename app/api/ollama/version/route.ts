import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";

export async function POST(req: Request) {
  logger.debug("POST /api/ollama/version");

  // Ensure the user is authenticated
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    logger.warn("GET /api/sync: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url } = await req.json();

  try {
    const ollamaResponse = await fetch(`${url}/api/version`);
    if (!ollamaResponse.ok) {
      return NextResponse.json(
        { success: false },
        { status: ollamaResponse.status },
      );
    }
    const data = await ollamaResponse.json();
    if (!data.version) {
      return NextResponse.json({ success: false }, { status: 500 });
    }
    const version = data.version;
    logger.debug({ version }, "POST /api/version: Version retrieved");
    return NextResponse.json({ version }, { status: 200 });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error, "Error in retrieving Ollama version:");
    return NextResponse.json({ error: "Failed to nuke" }, { status: 500 });
  }
}
