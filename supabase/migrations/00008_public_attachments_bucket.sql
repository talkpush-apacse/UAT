-- Make the attachments storage bucket public so uploaded files are permanently accessible
-- (previously private, which caused getPublicUrl to return non-functional URLs)
UPDATE storage.buckets SET public = true WHERE id = 'attachments';
