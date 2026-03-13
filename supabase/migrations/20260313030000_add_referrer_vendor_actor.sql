-- Migration: 20260313030000_add_referrer_vendor_actor.sql
-- Rollback: ALTER TABLE checklist_items DROP CONSTRAINT IF EXISTS checklist_items_actor_check;
--           ALTER TABLE checklist_items ADD CONSTRAINT checklist_items_actor_check CHECK (actor IN ('Candidate', 'Talkpush', 'Recruiter'));

-- Add "Referrer/Vendor" to the allowed actor types
ALTER TABLE checklist_items DROP CONSTRAINT IF EXISTS checklist_items_actor_check;
ALTER TABLE checklist_items ADD CONSTRAINT checklist_items_actor_check
  CHECK (actor IN ('Candidate', 'Talkpush', 'Recruiter', 'Referrer/Vendor'));
