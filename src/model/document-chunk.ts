import { getSupabaseClient } from '../lib/supabase';

export interface DocumentChunk {
  id?: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  created_at?: string;
  updated_at?: string;
}

const DocumentChunkModel = {
  async replaceForDocument(documentId: string, chunks: Array<Omit<DocumentChunk, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const supabase = getSupabaseClient();

    const { error: deleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) throw deleteError;

    if (chunks.length === 0) return;

    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunks);

    if (insertError) throw insertError;
  },

  async findByDocumentIds(documentIds: string[], limit = 500): Promise<DocumentChunk[]> {
    if (documentIds.length === 0) return [];

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .order('document_id', { ascending: true })
      .order('chunk_index', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as DocumentChunk[];
  },
};

export default DocumentChunkModel;
