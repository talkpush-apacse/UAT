-- Create storage bucket for tester file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- RLS: Allow anon to upload to attachments bucket
CREATE POLICY "Allow anon uploads to attachments"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'attachments');

-- RLS: Allow anon to read from attachments bucket
CREATE POLICY "Allow anon reads from attachments"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'attachments');
