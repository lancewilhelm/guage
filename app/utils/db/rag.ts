import * as lancedb from "@lancedb/lancedb";
import { logger } from "~/utils/logger"; // Assuming your logger utility
import type { MultiPartData } from "h3";
import { cloudDb } from "./cloud";
import { knowledge } from "./schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

// --- Configuration ---
const DB_PATH = process.env.LANCEDB_PATH || "data/vector.db"; // Use environment variable for path
const EMBEDDING_MODEL = "text-embedding-3-small"; // Or 'text-embedding-3-small'/'large'

// Basic splitter configuration
const CHUNK_SIZE = 500; // Max characters per chunk
const CHUNK_OVERLAP = 0; // Characters of overlap between chunks

// --- Initialize LanceDB Connection ---
// Use a promise to ensure the connection is established before use
let ragDb: lancedb.Connection;
async function connectToLanceDB() {
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
}

// Ensure connection is attempted on server startup
connectToLanceDB();

// --- Basic Text Splitter Function ---
export function simpleTextSplitter(
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
export async function generateEmbeddings(texts: string[]) {
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

export interface KnowledgeChunk {
  text: string;
  vector: number[] | undefined;
  metadata: {
    chunkIndex: number;
    source: string;
    userId: string;
    createdAt: string;
  };
  [key: string]: unknown;
}

export async function addDocumentstoLocalDB(
  dbName: string,
  dataToInsert: KnowledgeChunk[],
) {
  try {
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (!tables.includes(dbName)) {
      await db.createTable(dbName, dataToInsert);
      logger.debug(`Created new collection "${dbName}".`);
    } else {
      const _tbl = await db.openTable(dbName);
      await _tbl.add(dataToInsert);
    }
  } catch (error) {
    logger.error(
      { error, collectionName: dbName },
      "Failed to add documents to local DB",
    );
  }
}

// --- Main Ingestion Function ---
export async function processDocument(
  rawTextContent: string,
  originalFilename: string,
  dbName: string,
  userId: string,
) {
  if (!rawTextContent || !originalFilename || !dbName || !userId) {
    throw new Error("Missing required parameters for ingestion.");
  }

  logger.debug(
    `Starting ingestion for document "${originalFilename}" into db "${dbName}" by user "${userId}"`,
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
    const dataToInsert: KnowledgeChunk[] = chunks.map((chunk, index) => ({
      text: chunk,
      vector: embeddings[index], // Associate chunk with its embedding
      metadata: {
        chunkIndex: index,
        source: originalFilename,
        userId: userId,
        createdAt: new Date().toISOString(),
      },
    }));
    logger.debug(`Prepared ${dataToInsert.length} data points for insertion.`);

    return dataToInsert;
  } catch (error) {
    logger.error(
      { error, filename: originalFilename, chatId: dbName, userId },
      "Failed during document ingestion process",
    );
  }
}

export async function streamIngestFile(
  fileParts: MultiPartData[],
  dbName: string,
  userId: string,
  provider: string,
) {
  logger.debug(
    `Starting file ingestion for db "${dbName}" by user "${userId}" with provider "${provider}"`,
  );
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (provider === "local") {
          const dataToInsert: KnowledgeChunk[] = [];
          for (const [index, filePart] of fileParts.entries()) {
            const originalFilename: string = filePart.filename || "unknown.txt"; // Fallback name
            const fileType: string | undefined = filePart.type; // MIME type
            const fileContent: Buffer = filePart.data;
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ fileName: originalFilename, percent: ((index + 1) / fileParts.length) * 100 })}\n\n`,
              ),
            );
            logger.debug(
              `Processing file: "${originalFilename}", Type: "${fileType}", Size: ${fileContent.length}`,
            );
            const processedData = await processDocument(
              fileContent.toString(),
              originalFilename,
              dbName,
              userId,
            );
            if (processedData) {
              dataToInsert.push(...(processedData as KnowledgeChunk[]));
            }
          }
          if (dataToInsert.length > 0) {
            await addDocumentstoLocalDB(dbName, dataToInsert);
            const id = uuidv4();
            const now = new Date();
            await recordDatabase(
              id,
              dbName,
              userId,
              provider,
              fileParts.length,
              dataToInsert.length,
              now,
              now,
            );
            controller.enqueue(
              encoder.encode(
                `event: success\ndata: ${JSON.stringify({ id, dbName, documents: fileParts.length, chunks: dataToInsert.length, createdAt: now, updatedAt: now })}\n\n`,
              ),
            );
          }
        }
      } catch (error) {
        logger.error(error, "Error during file processing");
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: Error during file processing\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
  return stream;
}

export async function recordDatabase(
  id: string,
  dbName: string,
  userId: string,
  provider: string,
  documents: number,
  chunks: number,
  createdAt: Date,
  updatedAt: Date,
) {
  try {
    const details = { documents, chunks };
    await cloudDb.insert(knowledge).values({
      id,
      userId,
      name: dbName,
      provider,
      details,
      createdAt,
      updatedAt,
    });
  } catch (error) {
    logger.error(
      { error, dbName, userId, provider },
      "Failed to record database information",
    );
  }
}

export async function deleteKnowledgeDB(id: string) {
  try {
    // Delete from the cloud database
    await cloudDb.delete(knowledge).where(eq(knowledge.id, id));

    // Delete from the local LanceDB
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (tables.includes(id)) {
      await db.dropTable(id);
      logger.debug(`Deleted collection "${id}".`);
    } else {
      logger.warn(`Collection "${id}" does not exist.`);
    }
  } catch (error) {
    logger.error({ error, id }, "Failed to delete knowledge DB");
  }
}

export async function retreiveKnowledge(collectionName: string, query: string) {
  try {
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (!tables.includes(collectionName)) {
      logger.warn(`Collection "${collectionName}" does not exist.`);
      return [];
    }

    // Create the query embedding
    const queryEmbedding = await generateEmbeddings([query]);
    if (!queryEmbedding || !queryEmbedding[0]) {
      logger.error(`Failed to generate embedding for query "${query}".`);
      return [];
    }

    // Perform the search
    const table = await db.openTable(collectionName);
    const documents = await table.search(queryEmbedding[0]).limit(5).toArray(); // Retrieve all documents
    logger.debug(
      { documents },
      `Retrieved ${documents.length} documents from "${collectionName}".`,
    );
    return documents;
  } catch (error) {
    logger.error(
      { error, collectionName },
      "Failed to retrieve documents from collection",
    );
  }
}
