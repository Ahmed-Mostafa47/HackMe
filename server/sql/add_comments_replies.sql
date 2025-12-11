-- Migration: Add parent_id column to comments table for reply functionality
-- This allows comments to have replies (nested comments)

USE ctf_platform;

-- Add parent_id column to comments table
-- NULL means it's a top-level comment, otherwise it's a reply to the comment with that ID
ALTER TABLE comments 
ADD COLUMN parent_id INT NULL DEFAULT NULL AFTER id;

-- Add foreign key constraint
ALTER TABLE comments 
ADD CONSTRAINT fk_comments_parent 
FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;

-- Add index for better query performance when fetching replies
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Update existing comments to ensure they're all top-level (parent_id = NULL)
UPDATE comments SET parent_id = NULL WHERE parent_id IS NULL;





