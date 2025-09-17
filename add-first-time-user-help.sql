-- Add field to track if user has seen the help page
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_help_page BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN users.has_seen_help_page IS 'Whether the user has been shown the help page on first login';
