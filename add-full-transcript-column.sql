-- Add full_transcript column to gemini_logs table
ALTER TABLE gemini_logs 
ADD COLUMN full_transcript TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN gemini_logs.full_transcript IS 'Complete transcript content that was sent to Gemini AI';
