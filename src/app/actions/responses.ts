'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from './templates'
import { assertPremiumServer } from '@/lib/subscription'

interface JobResponseInput {
  itemId: string
  checked: boolean
  photoPath: string | null
  gpsLat: number | null
  gpsLng: number | null
}

/**
 * Submits the checklist items responses for a specific cleaning job,
 * uploads responses to `job_responses`, and marks the job as completed.
 */
export async function submitJobResponse(
  jobId: string,
  responses: JobResponseInput[]
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()
    if (!jobId || !responses || responses.length === 0) {
      return { success: false, error: 'Job ID and checklist responses are required.' }
    }

    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // 2. Fetch the job and verify assignment
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, assigned_to, status')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return { success: false, error: 'Job not found.' }
    }

    if (job.assigned_to !== user.id) {
      return { success: false, error: 'Access denied. This job is not assigned to you.' }
    }

    if (job.status === 'completed') {
      return { success: false, error: 'This job has already been completed.' }
    }

    // 3. Prepare response rows for database insertion
    const responseRows = responses.map((r) => ({
      job_id: jobId,
      item_id: r.itemId,
      checked: r.checked,
      photo_path: r.photoPath || null,
      gps_lat: r.gpsLat !== null ? Number(r.gpsLat) : null,
      gps_lng: r.gpsLng !== null ? Number(r.gpsLng) : null,
    }))

    // 4. Insert response rows
    const { error: insertErr } = await supabase
      .from('job_responses')
      .insert(responseRows)

    if (insertErr) {
      return { success: false, error: `Failed to save responses: ${insertErr.message}` }
    }

    // 5. Update job status to completed
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (updateErr) {
      return { success: false, error: `Failed to complete job: ${updateErr.message}` }
    }

    // 6. Revalidate routes
    revalidatePath('/crew/jobs')
    revalidatePath(`/crew/jobs/${jobId}`)
    revalidatePath('/jobs')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
