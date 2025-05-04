import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";
import type { MultiPartData } from "h3";
import { streamIngestFile } from "~~/server/utils/db/rag";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/knowledge/document"); // Updated log path to match frontend

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/knowledge/document: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  let provider: string | undefined;
  let dbName: string | undefined;
  const fileParts: MultiPartData[] = []; // To store the file parts named 'documents'

  try {
    // Use readMultipartFormData to parse the incoming file data and fields
    const formDataParts = await readMultipartFormData(event);

    // Check if any parts were found
    if (!formDataParts || formDataParts.length === 0) {
      logger.error("POST /api/knowledge/document: No form data parts received");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request: No form data received",
      });
    }

    // Iterate through the parts to find fields and files
    for (const part of formDataParts) {
      if (part.name === "provider" && part.data) {
        provider = part.data.toString("utf-8");
      } else if (part.name === "dbName" && part.data) {
        dbName = part.data.toString("utf-8");
      } else if (part.name === "documents" && part.filename && part.data) {
        // This is a file part named 'documents'
        fileParts.push(part);
      }
      // Ignore other potential parts if any
    }

    // Validate required fields (provider and dbName based on user prompt)
    if (!provider) {
      logger.error("POST /api/knowledge/document: 'provider' field missing");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request: 'provider' field is required.",
      });
    }

    if (!dbName) {
      logger.error("POST /api/knowledge/document: 'dbName' field missing");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request: 'dbName' field is required.",
      });
    }

    // Check if any files named 'documents' were uploaded
    if (fileParts.length === 0) {
      logger.error(
        "POST /api/knowledge/document: No files uploaded under 'documents' key",
      );
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request: No files uploaded.",
      });
    }

    try {
      const stream = await streamIngestFile(
        fileParts,
        dbName,
        session.user.id,
        provider,
      );

      // Set the response headers for SSE
      setHeaders(event, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      });
      return sendStream(event, stream);
    } catch (error) {
      logger.error(
        error,
        "POST /api/knowledge/document: Error during file ingestion",
      );
      setResponseStatus(event, 500);
      return {
        message: "Error during file ingestion",
      };
    }

    return;
  } catch (error) {
    // Catch explicit H3 errors thrown above or other unexpected errors
    logger.error(error, "Error processing file upload request");

    // If error hasn't been set with createError, set a generic 500
    if (!event.res.statusCode || event.res.statusCode < 400) {
      setResponseStatus(event, 500);
    }

    return {
      message: error || "An unexpected error occurred.",
      // Optionally include processingResults if available before the catch
    };
  }
});
