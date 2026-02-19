import { getSupabaseClient } from '../lib/supabase';


// User type matching Supabase table schema
export interface User {
  id?: string;
  username: string;
  hashed_password: string;
  created_at?: string;
  updated_at?: string;
}

// User type without password (for API responses)
export interface UserPublic {
  id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to remove password from user object
export function toPublicUser(user: User): UserPublic {
  const { hashed_password, ...publicUser } = user;
  return publicUser as UserPublic;
}

// Database operations using Supabase
export const UserModel = {
  // Create a new user
  async create(userData: { username: string; hashed_password: string }): Promise<User> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  // Find user by ID
  async findById(id: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  // Update user
  async update(id: string, updates: Partial<Pick<User, 'username' | 'hashed_password'>>): Promise<User> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete user
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export default UserModel;