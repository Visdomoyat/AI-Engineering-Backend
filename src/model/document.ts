import { getSupabaseClient } from '../lib/supabase';

export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

export interface Document {
  id?: string;
  user_id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  status: DocumentStatus;
  created_at?: string;
  updated_at?: string;
}

export const DocumentModel = {
  async create(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  },

  async findAllByUserId(userId: string): Promise<Document[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Document[];
  },

  async findByIdForUser(documentId: string, userId: string): Promise<Document | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') return null;
      throw error;
    }

    return data as Document;
  },

  async findByIdsForUser(documentIds: string[], userId: string): Promise<Document[]> {
    if (documentIds.length === 0) return [];
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .in('id', documentIds);

    if (error) throw error;
    return (data ?? []) as Document[];
  },

  async findIndexedByUserId(userId: string): Promise<Document[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'indexed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Document[];
  },

  async updateStatus(documentId: string, status: DocumentStatus): Promise<Document> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  },

  async deleteById(documentId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  },
};

export default DocumentModel;
