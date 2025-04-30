import * as lancedb from "@lancedb/lancedb";
import { logger } from "~/utils/logger"; // Assuming your logger utility

// --- Configuration ---
const DB_PATH = process.env.LANCEDB_PATH || "data/vector.db"; // Use environment variable for path
const EMBEDDING_MODEL = "text-embedding-3-small"; // Or 'text-embedding-3-small'/'large'

// Basic splitter configuration
const CHUNK_SIZE = 500; // Max characters per chunk
const CHUNK_OVERLAP = 0; // Characters of overlap between chunks

// --- Initialize LanceDB Connection ---
// Use a promise to ensure the connection is established before use
let ragDb: lancedb.Connection;
const connectToLanceDB = async () => {
  if (!ragDb) {
    try {
      ragDb = await lancedb.connect(DB_PATH);
      logger.debug(`Connected to LanceDB at ${DB_PATH}`);
    } catch (error) {
      logger.error({ error, path: DB_PATH }, "Failed to connect to LanceDB");
      throw new Error(`Failed to connect to LanceDB at ${DB_PATH}`);
    }
  }
  return ragDb;
};

// Ensure connection is attempted on server startup
connectToLanceDB();

// --- Basic Text Splitter Function ---
function simpleTextSplitter(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/); // Split by sentence endings or newlines

  let currentChunk = "";
  for (const sentence of sentences) {
    // If adding the next sentence exceeds chunk size, push the current chunk
    if (
      currentChunk.length + sentence.length + (currentChunk ? 1 : 0) >
      chunkSize
    ) {
      if (currentChunk) {
        // Only push if currentChunk is not empty
        chunks.push(currentChunk.trim());
      }
      // Start a new chunk, potentially adding overlap from the end of the previous one
      currentChunk = currentChunk
        .slice(Math.max(0, currentChunk.length - chunkOverlap))
        .trim();
      if (currentChunk) {
        currentChunk += " "; // Add space if overlap exists
      }
      currentChunk += sentence;
    } else {
      // Otherwise, add the sentence to the current chunk
      if (currentChunk) {
        currentChunk += " "; // Add space between sentences
      }
      currentChunk += sentence;
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // Basic fallback for very long single lines/sentences that exceed chunk size
  if (chunks.length === 1 && chunks[0] && chunks[0].length > chunkSize) {
    logger.warn(
      `Single chunk exceeding size ${chunkSize}. Falling back to simple character split.`,
    );
    const fallbackChunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
      fallbackChunks.push(text.substring(i, i + chunkSize));
    }
    return fallbackChunks.filter((c) => c.trim().length > 0);
  }

  return chunks.filter((c) => c.trim().length > 0); // Filter out any empty chunks
}

// --- Generate Embeddings Function ---
async function generateEmbeddings(texts: string[]) {
  try {
    const openai = getOpenAIClient(); // Ensure client is initialized
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts, // Pass the array of texts
    });

    // The response contains an array of embedding objects
    // We need to extract the 'embedding' array from each object
    const embeddings = response.data.map((item) => item.embedding);

    if (embeddings.length !== texts.length) {
      logger.error(
        `Embedding mismatch: Expected ${texts.length} embeddings, got ${embeddings.length}`,
      );
      throw new Error(
        "Mismatch between input texts and generated embeddings count.",
      );
    }

    logger.debug(`Generated ${embeddings.length} embeddings.`);
    return embeddings;
  } catch (error) {
    logger.error(
      { error, textsCount: texts.length },
      "Failed to generate embeddings from OpenAI",
    );
  }
}

// --- Main Ingestion Function ---
export async function ingestDocumentForRAG(
  rawTextContent: string,
  originalFilename: string,
  chatId: string, // Use chatId as collection name
  userId: string, // User ID for metadata
) {
  if (!rawTextContent || !originalFilename || !chatId || !userId) {
    throw new Error("Missing required parameters for ingestion.");
  }

  logger.debug(
    `Starting ingestion for document "${originalFilename}" into chat "${chatId}" by user "${userId}"`,
  );

  try {
    // 1. Split the text
    const chunks = simpleTextSplitter(
      rawTextContent,
      CHUNK_SIZE,
      CHUNK_OVERLAP,
    );
    if (chunks.length === 0) {
      logger.warn(
        `No text chunks generated from document "${originalFilename}".`,
      );
      return {
        success: true,
        message: "No processable text found.",
        chunksCount: 0,
      };
    }
    logger.debug(`Split document into ${chunks.length} chunks.`);

    // 2. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);
    if (!embeddings || embeddings.length === 0) {
      logger.error(
        `Failed to generate embeddings for document "${originalFilename}".`,
      );
      return {
        success: false,
        message: "Failed to generate embeddings.",
        chunksCount: chunks.length,
      };
    }

    // 3. Prepare data for insertion
    const dataToInsert = chunks.map((chunk, index) => ({
      text: chunk,
      vector: embeddings[index], // Associate chunk with its embedding
      metadata: {
        filename: originalFilename,
        userId: userId,
        // Add other metadata here, e.g., original page number if available
        // chunkIndex: index, // Optional: store the index of the chunk
      },
    }));
    logger.debug(`Prepared ${dataToInsert.length} data points for insertion.`);

    // 4. Insert data into the collection
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (!tables.includes(chatId)) {
      await db.createTable(chatId, dataToInsert);
      logger.debug(`Created new collection "${chatId}".`);
    } else {
      const _tbl = await db.openTable(chatId);
      await _tbl.add(dataToInsert);
    }

    logger.debug(
      `Successfully ingested ${dataToInsert.length} chunks into collection "${chatId}".`,
    );

    return {
      success: true,
      message: "Document ingested successfully.",
      chunksCount: dataToInsert.length,
      collectionName: chatId,
    };
  } catch (error) {
    logger.error(
      { error, filename: originalFilename, chatId, userId },
      "Failed during document ingestion process",
    );
  }
}

// Export the splitter and embedding functions if you want to test them separately
// export { simpleTextSplitter, generateEmbeddings };
