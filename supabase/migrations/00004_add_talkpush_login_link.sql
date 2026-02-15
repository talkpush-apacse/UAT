-- Add talkpush_login_link column to projects table
-- Stores the Talkpush login URL that testers will use for Talkpush steps
ALTER TABLE projects ADD COLUMN talkpush_login_link TEXT;
