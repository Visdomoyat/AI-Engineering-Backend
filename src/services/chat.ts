import type { Document } from '../model/document';
import DocumentModel from '../model/document';
import type { DocumentChunk } from '../model/document-chunk';
import DocumentChunkModel from '../model/document-chunk';
import { generateWithXai } from './llm';

type ChatRequest = {
  userId: string;
  message: string;
  documentIds?: string[];
  topK?: number;
};

export type ChatResponse = {
  answer: string;
  sources: Array<{ documentId: string; chunkIndex: number; excerpt: string }>;
  usedModel: string;
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that',
  'the', 'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function scoreChunk(chunk: DocumentChunk, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const text = chunk.content.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (text.includes(token)) score += 1;
  }

  return score;
}

function chooseDocuments(allIndexedDocuments: Document[], requestedIds?: string[]): Document[] {
  if (!requestedIds || requestedIds.length === 0) {
    return allIndexedDocuments;
  }

  const requestedIdSet = new Set(requestedIds);
  return allIndexedDocuments.filter((doc) => !!doc.id && requestedIdSet.has(doc.id));
}

function buildContext(topChunks: Document[]): string {
  return topChunks
    .map((chunk, idx) => `Source ${idx + 1}: ${chunk.filename}\n${chunk.storage_path}`)
    .join('\n\n');
}

function fallbackAnswer(message: string, chunks: DocumentChunk[]): string {
  if (chunks.length === 0) {
    return 'I could not find relevant indexed content for your question. Upload and index a PDF first.';
  }

  const combined = chunks.map((chunk) => chunk.content).join(' ');
  const excerpt = combined.slice(0, 1200).trim();

  return `Based on your uploaded content, here is the most relevant context for "${message}":\n\n${excerpt}`;
}

export async function answerFromIndexedDocuments(input: ChatRequest): Promise<ChatResponse> {
  const allIndexedDocuments = await DocumentModel.findIndexedByUserId(input.userId);
  const selectedDocuments = chooseDocuments(allIndexedDocuments, input.documentIds);

  const selectedIds = selectedDocuments
    .map((doc) => doc.id)
    .filter((id): id is string => !!id);

  const chunks = await DocumentChunkModel.findByDocumentIds(selectedIds, 1200);
  const queryTokens = tokenize(input.message);

  const rankedChunks = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(input.topK ?? 6, 12)))
    .map((item) => item.chunk);

  const sources = rankedChunks.map((chunk) => ({
    documentId: chunk.document_id,
    chunkIndex: chunk.chunk_index,
    excerpt: chunk.content.slice(0, 240),
  }));

  const docLookup = new Map(selectedDocuments.map((doc) => [doc.id, doc]));
  const context = rankedChunks
    .map((chunk, idx) => {
      const document = docLookup.get(chunk.document_id);
      const filename = document?.filename || 'unknown.pdf';
      return `Context ${idx + 1} (${filename}, chunk ${chunk.chunk_index}):\n${chunk.content}`;
    })
    .join('\n\n');

  if (rankedChunks.length === 0) {
    return {
      answer: fallbackAnswer(input.message, []),
      sources: [],
      usedModel: 'retrieval-fallback',
    };
  }

  try {
    const llmResponse = await generateWithXai([
      {
        role: 'system',
        content: 'You are a retrieval-grounded assistant. Answer only from the provided context. If context is insufficient, say what is missing.',
      },
      {
        role: 'user',
        content: `Question:\n${input.message}\n\nContext:\n${context}`,
      },
    ]);

    if (llmResponse) {
      return {
        answer: llmResponse.text,
        sources,
        usedModel: llmResponse.model,
      };
    }
  } catch (error) {
    // Fall back to deterministic response if remote model call fails.
  }

  return {
    answer: fallbackAnswer(input.message, rankedChunks),
    sources,
    usedModel: 'retrieval-fallback',
  };
}
