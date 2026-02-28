-- Create table for handbook generation jobs and outputs
CREATE TABLE IF NOT EXISTS handbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  target_words INTEGER NOT NULL DEFAULT 20000 CHECK (target_words >= 1000),
  generated_words INTEGER NOT NULL DEFAULT 0 CHECK (generated_words >= 0),
  content TEXT NULL,
  error_message TEXT NULL,
  source_document_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handbooks_user_id ON handbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_handbooks_status ON handbooks(status);
CREATE INDEX IF NOT EXISTS idx_handbooks_created_at ON handbooks(created_at DESC);

CREATE TRIGGER update_handbooks_updated_at
  BEFORE UPDATE ON handbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
