import { auth } from "~/utils/auth";
import { logger } from "~/utils/logger";
import { ingestDocumentForRAG } from "~/utils/db/rag";

export default defineEventHandler(async (event) => {
  logger.info("POST /api/file");

  // Ensure the user is authenticated
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    logger.error("POST /api/file: Unauthorized access attempt");
    setResponseStatus(event, 401);
    return {
      message: "Unauthorized",
    };
  }

  try {
    // Use readMultipartFormData to parse the incoming file data
    const formDataParts = await readMultipartFormData(event);

    // Check if any parts were found
    if (!formDataParts || formDataParts.length === 0) {
      logger.error("POST /api/file: No form data parts received");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request: No form data received",
      });
    }

    // Get the chatId from the request body
    const chatIdPart = formDataParts.find((part) => part.name === "chatId");
    let chatId: string | null = null;

    if (chatIdPart && chatIdPart.data) {
      chatId = chatIdPart.data.toString("utf-8");
    } else {
      logger.error("POST /api/file: No chatId part found");
      setResponseStatus(event, 400);
      return {
        message: "Invalid request: No chatId provided",
      };
    }

    // Find the part named 'document' (this matches formData.append('document', file) on the frontend)
    const filePart = formDataParts.find((part) => part.name === "document");

    // Check if the file part exists and has data
    if (!filePart || !filePart.data || !filePart.filename) {
      logger.error(
        "POST /api/file: No document file part found or data missing",
      );
      setResponseStatus(event, 400);
      return {
        message: "Invalid request: No document file uploaded or data missing",
      };
    }

    // Access the file content (as a Buffer) and filename
    const fileContent: Buffer = filePart.data;
    const originalFilename: string = filePart.filename;
    const fileType: string | undefined = filePart.type; // MIME type

    // Ingest the document for RAG
    const response = await ingestDocumentForRAG(
      fileContent.toString("utf-8"),
      originalFilename,
      chatId,
      session.user.id,
    );

    if (!response || !response.success) {
      logger.error(
        `POST /api/file: Failed to ingest document "${originalFilename}"`,
      );
      setResponseStatus(event, 500);
      return {
        message: "Failed to ingest document",
      };
    }

    logger.debug(
      `Successfully ingested file "${originalFilename}" with size ${fileContent.length}`,
    );

    // Return a success response
    setResponseStatus(event, 200);
    return {
      message: "Document received and ready for processing",
      filename: originalFilename,
      size: fileContent.length,
      chunksCount: response.chunksCount,
    };
  } catch (error) {
    // Catch explicit H3 errors thrown above or other unexpected errors
    logger.error(error, "Error processing file upload");
  }
});
