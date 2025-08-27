-- Migration: Add support for multiple Avoma recordings
-- This migration adds a new table to store multiple Avoma recordings per SOW

-- Create the avoma_recordings table
CREATE TABLE IF NOT EXISTS avoma_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  transcription TEXT,
  title TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_avoma_recordings_sow_id ON avoma_recordings(sow_id);
CREATE INDEX IF NOT EXISTS idx_avoma_recordings_status ON avoma_recordings(status);

-- Add RLS policies
ALTER TABLE avoma_recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see recordings for SOWs they have access to
CREATE POLICY "Users can view avoma_recordings for accessible SOWs" ON avoma_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sows 
      WHERE sows.id = avoma_recordings.sow_id 
      AND (
        sows.author_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Policy: Users can insert recordings for SOWs they have access to
CREATE POLICY "Users can insert avoma_recordings for accessible SOWs" ON avoma_recordings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sows 
      WHERE sows.id = avoma_recordings.sow_id 
      AND (
        sows.author_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Policy: Users can update recordings for SOWs they have access to
CREATE POLICY "Users can update avoma_recordings for accessible SOWs" ON avoma_recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sows 
      WHERE sows.id = avoma_recordings.sow_id 
      AND (
        sows.author_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Policy: Users can delete recordings for SOWs they have access to
CREATE POLICY "Users can delete avoma_recordings for accessible SOWs" ON avoma_recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sows 
      WHERE sows.id = avoma_recordings.sow_id 
      AND (
        sows.author_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_avoma_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_avoma_recordings_updated_at
  BEFORE UPDATE ON avoma_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_avoma_recordings_updated_at();

-- Add comment to table
COMMENT ON TABLE avoma_recordings IS 'Stores multiple Avoma recordings per SOW for comprehensive transcription analysis';
