import { logger } from "~/utils/logger"; // Assuming your logger utility
import type { MultiPartData } from "h3";
import { cloudDb } from "./cloud";
import { knowledge } from "../../../app/utils/db/schema";
import { v4 as uuidv4 } from "uuid";
import { sql, eq } from "drizzle-orm";
import type { Connection } from "@lancedb/lancedb";

// --- Configuration ---
const DB_PATH = process.env.LANCEDB_PATH || "data/vector.db"; // Use environment variable for path
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 0;

// --- Initialize LanceDB Connection ---
let ragDb: Connection;
async function connectToLanceDB() {
  if (!ragDb) {
    try {
      // dynamically import the native addon at runtime
      const lancedb = await import("@lancedb/lancedb");
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
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (
      currentChunk.length + sentence.length + (currentChunk ? 1 : 0) >
      chunkSize
    ) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = currentChunk
        .slice(Math.max(0, currentChunk.length - chunkOverlap))
        .trim();
      if (currentChunk) currentChunk += " ";
      currentChunk += sentence;
    } else {
      if (currentChunk) currentChunk += " ";
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

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

  return chunks.filter((c) => c.trim().length > 0);
}

// --- Generate Embeddings Function ---
export async function generateEmbeddings(texts: string[]) {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

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
  id: string;
  text: string;
  chunkIndex: number;
  source: string;
  userId: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface KnowledgeChunkWithVector extends KnowledgeChunk {
  vector: number[] | undefined;
}

export async function addDocumentstoLocalDB(
  dbName: string,
  dataToInsert: KnowledgeChunkWithVector[],
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

    const embeddings = await generateEmbeddings(chunks);
    if (!embeddings?.length) {
      logger.error(
        `Failed to generate embeddings for document "${originalFilename}".`,
      );
      return {
        success: false,
        message: "Failed to generate embeddings.",
        chunksCount: chunks.length,
      };
    }

    const dataToInsert: KnowledgeChunkWithVector[] = chunks.map(
      (chunk, index) => ({
        id: uuidv4(),
        text: chunk,
        vector: embeddings[index],
        chunkIndex: index,
        source: originalFilename,
        userId: userId,
        createdAt: new Date().toISOString(),
      }),
    );
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
          const dataToInsert: KnowledgeChunkWithVector[] = [];
          for (const [index, filePart] of fileParts.entries()) {
            const originalFilename: string = filePart.filename || "unknown.txt";
            const fileContent: Buffer = filePart.data;
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify({ fileName: originalFilename, percent: ((index + 1) / fileParts.length) * 100 })}\n\n`,
              ),
            );
            logger.debug(
              `Processing file: "${originalFilename}", Size: ${fileContent.length}`,
            );
            const processedData = await processDocument(
              fileContent.toString(),
              originalFilename,
              dbName,
              userId,
            );
            if (processedData)
              dataToInsert.push(
                ...(processedData as KnowledgeChunkWithVector[]),
              );
          }

          if (dataToInsert.length > 0) {
            await addDocumentstoLocalDB(dbName, dataToInsert);
            const now = new Date();
            const response = await recordDatabase(
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
                `event: success\ndata: ${JSON.stringify({ ...response })}\n\n`,
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
  dbName: string,
  userId: string,
  provider: string,
  documents: number,
  chunks: number,
  createdAt: Date,
  updatedAt: Date,
) {
  try {
    // first check if the database exists
    let id = uuidv4();
    const resCheck = await cloudDb
      .select()
      .from(knowledge)
      .where(eq(knowledge.name, dbName));
    if (resCheck.length > 0) {
      id = resCheck[0].id;
      documents = resCheck[0].documents + documents;
      chunks = resCheck[0].chunks + chunks;
    }

    // then insert or update the database information
    const resInsert = await cloudDb
      .insert(knowledge)
      .values({
        id,
        userId,
        name: dbName,
        provider,
        documents,
        chunks,
        createdAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: knowledge.id,
        set: {
          documents: sql.raw("EXCLUDED.documents"),
          chunks: sql.raw("EXCLUDED.chunks"),
          updatedAt: sql.raw("EXCLUDED.updated_at"),
        },
      })
      .returning();
    return resInsert[0];
  } catch (error) {
    logger.error(
      { error, dbName, userId, provider },
      "Failed to record database information",
    );
  }
}

export async function deleteKnowledgeDB(id: string, name: string) {
  try {
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (tables.includes(name)) {
      await cloudDb.delete(knowledge).where(eq(knowledge.id, id));
      await db.dropTable(name);
      logger.debug(`Deleted collection ${id}: ${name}.`);
    } else {
      logger.warn(`Collection ${id}: ${name} does not exist.`);
    }
  } catch (error) {
    logger.error({ error, id }, "Failed to delete knowledge DB");
  }
}

export interface KnowledgeDocumentResponse extends KnowledgeChunk {
  _distance: number;
}

export async function retrieveKnowledge(
  collectionName: string,
  type: "all" | "vector",
  query?: string,
) {
  try {
    const db = await connectToLanceDB();
    const tables = await db.tableNames();
    if (!tables.includes(collectionName)) {
      logger.warn(`Collection "${collectionName}" does not exist.`);
      return [];
    }

    if (type === "vector" && query) {
      const queryEmbeddings = await generateEmbeddings([query]);
      if (!queryEmbeddings) {
        logger.error(`Failed to generate embedding for query "${query}".`);
        return [];
      }

      const table = await db.openTable(collectionName);
      const queryEmbedding = queryEmbeddings[0];
      if (!queryEmbedding) {
        logger.error(`No embedding generated for query "${query}".`);
        return [];
      }
      const documents = (await table
        .search(queryEmbedding)
        .limit(5)
        .toArray()) as KnowledgeDocumentResponse[];

      logger.debug(
        { documents },
        `Retrieved ${documents.length} documents from "${collectionName}".`,
      );

      // remove the vector from the response
      const remappedDocuments = documents.map((doc) => {
        const { vector: _, ...rest } = doc;
        return rest;
      });
      return remappedDocuments;
    } else if (type === "all") {
      const table = await db.openTable(collectionName);
      const documents = await table.query().toArray();

      logger.debug(
        { documents },
        `Retrieved ${documents.length} documents from "${collectionName}".`,
      );

      // remove the vector from the response
      const remappedDocuments = documents.map((doc) => {
        const { vector: _, ...rest } = doc;
        return rest;
      }) as KnowledgeDocumentResponse[];
      return remappedDocuments;
    }
  } catch (error) {
    logger.error(
      { error, collectionName },
      "Failed to retrieve documents from collection",
    );
  }
}
