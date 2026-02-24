import type { Document } from '../model/document';
import DocumentModel from '../model/document';

export async function enqueueDocumentIngestion(document: Document): Promise<void> {
  // Hook point for a real parser + LightRAG pipeline.
  // Set DOCUMENT_INGESTION_MODE=stub to exercise status transitions locally.
  const mode = (process.env.DOCUMENT_INGESTION_MODE || 'none').toLowerCase();
  if (mode !== 'stub' || !document.id) return;

  await DocumentModel.updateStatus(document.id, 'processing');
  await DocumentModel.updateStatus(document.id, 'indexed');
}

