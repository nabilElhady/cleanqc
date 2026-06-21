import { createClient } from '@/lib/supabase/client'

interface UploadProofParams {
  orgId: string
  jobId: string
  file: File
}

interface UploadResponse {
  success: boolean
  path?: string
  error?: string
}

/**
 * Secure client-side upload helper for Job Proofs.
 * Streams the file directly to Supabase from the browser, bypassing the Node.js server.
 * Storage RLS policies ensure the user is authorized for this specific orgId/jobId path.
 */
export async function uploadJobProof({ orgId, jobId, file }: UploadProofParams): Promise<UploadResponse> {
  const supabase = createClient()

  // 1. Double-check MIME types on the client before attempting upload to save bandwidth
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' }
  }

  // 2. Double-check file size (5MB = 5 * 1024 * 1024 bytes)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds the 5MB limit.' }
  }

  // 3. Generate a secure, collision-resistant filename
  const fileExt = file.name.split('.').pop()
  const randomId = crypto.randomUUID()
  const fileName = `${randomId}.${fileExt}`

  // 4. Construct the precise tenant-isolated path matching the RLS policy: org_id/job_id/filename
  const filePath = `${orgId}/${jobId}/${fileName}`

  // 5. Upload directly to Supabase Storage
  const { data, error } = await supabase.storage
    .from('job-proofs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false // Prevent overwriting existing proofs accidentally
    })

  if (error) {
    console.error('Upload Error:', error.message)
    // Mask raw storage errors for the UI if necessary
    return { success: false, error: error.message }
  }

  return { success: true, path: data.path }
}
