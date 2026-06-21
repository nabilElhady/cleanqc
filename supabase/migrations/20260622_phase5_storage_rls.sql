-- PHASE 5: Secure Storage Bucket for Job Proofs

-- 1. Create or update the 'job-proofs' bucket
-- Strict enforcement at the bucket level for MIME types and max size (5MB = 5242880 bytes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-proofs',
  'job-proofs',
  false, -- private bucket!
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if applying this over an older setup
DROP POLICY IF EXISTS "Crew can upload proofs to assigned jobs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view proofs within their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploaded proofs" ON storage.objects;

-- 2. UPLOAD POLICY (INSERT)
-- Security: The user attempting the upload must be authenticated AND must be the exact crew member assigned to the job.
-- Path Format: org_id/job_id/filename.extension
-- storage.foldername(name) splits the path into an array. [1] is org_id, [2] is job_id.
CREATE POLICY "Crew can upload proofs to assigned jobs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-proofs' 
  AND auth.uid() IN (
    SELECT assigned_to 
    FROM public.jobs 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- 3. READ POLICY (SELECT)
-- Security: Cross-tenant isolation. A user can only view/download photos if their profile's org_id matches the org_id in the folder path.
CREATE POLICY "Users can view proofs within their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-proofs' 
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- 4. DELETE POLICY (DELETE) - Optional but recommended for cleanup
-- Security: Crew can delete a photo if they made a mistake, OR managers can delete it if they share the org_id.
CREATE POLICY "Users can delete proofs within their org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-proofs' 
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);
