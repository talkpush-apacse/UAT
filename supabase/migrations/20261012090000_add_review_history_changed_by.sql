-- Migration: 20261012090000_add_review_history_changed_by.sql
-- Rollback: ALTER TABLE admin_review_history DROP COLUMN IF EXISTS changed_by;

-- Who made a review change. Free text so it can hold an admin's email, the
-- label for a shared-password admin session, or an MCP caller such as
-- "jolo.yu@talkpush.com (via MCP)" / "Shared key (via MCP)". NULL for history
-- rows recorded before this column existed.
ALTER TABLE admin_review_history ADD COLUMN IF NOT EXISTS changed_by TEXT;
