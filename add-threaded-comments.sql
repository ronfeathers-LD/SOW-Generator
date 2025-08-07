-- Add threading support to approval_comments table
-- This allows comments to be replies to other comments

-- Add parent_id column to reference parent comment
ALTER TABLE approval_comments 
ADD COLUMN parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE;

-- Add index for better performance when querying threads
CREATE INDEX idx_approval_comments_parent_id ON approval_comments(parent_id);

-- Add index for better performance when querying by sow_id and parent_id
CREATE INDEX idx_approval_comments_sow_parent ON approval_comments(sow_id, parent_id);

-- Add a comment to document the threading structure
COMMENT ON COLUMN approval_comments.parent_id IS 'References the parent comment for threaded conversations. NULL means this is a top-level comment.'; 