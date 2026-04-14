-- Migration: 20260414140000_expand_attachment_mime_types.sql
-- Rollback: UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'] WHERE id = 'attachments';

-- Expand the allowed MIME types on the attachments storage bucket to include
-- PDF and Word documents in addition to the existing image/video types.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'attachments';
