import { getSupabaseClient } from '../lib/supabase';

export type HandbookStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Handbook {
  id?: string;
  user_id: string;
  title: string;
  prompt: string;
  status: HandbookStatus;
  target_words: number;
  generated_words: number;
  content: string | null;
  error_message: string | null;
  source_document_ids: string[];
  created_at?: string;
  updated_at?: string;
}

type CreateHandbookInput = Omit<
  Handbook,
  'id' | 'created_at' | 'updated_at' | 'generated_words' | 'content' | 'error_message' | 'status'
> & {
  status?: HandbookStatus;
};

const HandbookModel = {
  async create(input: CreateHandbookInput): Promise<Handbook> {
    const supabase = getSupabaseClient();
    const payload = {
      ...input,
      status: input.status ?? 'queued',
      generated_words: 0,
      content: null,
      error_message: null,
    };

    const { data, error } = await supabase
      .from('handbooks')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;
    return data as Handbook;
  },

  async findByIdForUser(handbookId: string, userId: string): Promise<Handbook | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .eq('id', handbookId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') return null;
      throw error;
    }

    return data as Handbook;
  },

  async findAllByUserId(userId: string): Promise<Handbook[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('handbooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Handbook[];
  },

  async updateStatus(handbookId: string, status: HandbookStatus): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('handbooks')
      .update({ status })
      .eq('id', handbookId);

    if (error) throw error;
  },

  async markCompleted(handbookId: string, content: string, generatedWords: number): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('handbooks')
      .update({
        status: 'completed',
        content,
        generated_words: generatedWords,
        error_message: null,
      })
      .eq('id', handbookId);

    if (error) throw error;
  },

  async markFailed(handbookId: string, errorMessage: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('handbooks')
      .update({
        status: 'failed',
        error_message: errorMessage.slice(0, 3000),
      })
      .eq('id', handbookId);

    if (error) throw error;
  },
};

export default HandbookModel;
