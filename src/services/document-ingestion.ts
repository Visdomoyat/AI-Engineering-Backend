import type { Document } from '../model/document';
import DocumentModel from '../model/document';
import DocumentChunkModel from '../model/document-chunk';
import { getSupabaseClient } from '../lib/supabase';
import { chunkText, extractTextFromPdf } from './pdf-processing';

export async function enqueueDocumentIngestion(document: Document): Promise<void> {
  const mode = (process.env.DOCUMENT_INGESTION_MODE || 'live').toLowerCase();
  if (mode === 'none' || !document.id) return;

  if (mode === 'stub') {
    await DocumentModel.updateStatus(document.id, 'processing');
    await DocumentModel.updateStatus(document.id, 'indexed');
    return;
  }

  await DocumentModel.updateStatus(document.id, 'processing');

  try {
    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || 'documents';
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(document.storage_path);

    if (error || !data) {
      throw new Error(error?.message || 'Unable to download uploaded PDF from storage');
    }

    const arrayBuffer = await data.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const extractedText = extractTextFromPdf(pdfBuffer);
    const chunks = chunkText(extractedText);

    await DocumentChunkModel.replaceForDocument(
      document.id,
      chunks.map((chunk) => ({
        document_id: document.id as string,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_count: chunk.tokenCount,
      }))
    );

    if (chunks.length === 0) {
      throw new Error('No extractable text found in PDF');
    }

    await DocumentModel.updateStatus(document.id, 'indexed');
  } catch (error) {
    await DocumentModel.updateStatus(document.id, 'failed');
    throw error;
  }
}
