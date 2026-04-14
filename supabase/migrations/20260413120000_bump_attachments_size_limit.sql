-- Increase attachments bucket size limit from 10 MB to 50 MB so admins can
-- upload screenshots/videos as View Sample references for checklist items.
-- Tester uploads remain capped at 10 MB in /api/upload-url and in the tester
-- file-upload component, so this change does not affect tester behavior.
update storage.buckets
set file_size_limit = 52428800 -- 50 * 1024 * 1024
where id = 'attachments';
