'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from './templates'
import { assertPremiumServer } from '@/lib/subscription'
import { cookies } from 'next/headers'
import { z } from 'zod'

const JobResponseInputSchema = z.object({
  itemId: z.string().min(1, 'Invalid item ID.'),
  checked: z.boolean(),
  photoPath: z.string().max(500).nullable().optional(),
  gpsLat: z.number().min(-90, 'Latitude must be between -90 and 90.').max(90, 'Latitude must be between -90 and 90.').nullable().optional(),
  gpsLng: z.number().min(-180, 'Longitude must be between -180 and 180.').max(180, 'Longitude must be between -180 and 180.').nullable().optional(),
})

const SubmitJobResponseSchema = z.object({
  jobId: z.string().uuid('Invalid job ID.'),
  responses: z.array(JobResponseInputSchema).min(1).max(100),
})

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

    const validatedFields = SubmitJobResponseSchema.safeParse({ jobId, responses })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { jobId: parsedJobId, responses: parsedResponses } = validatedFields.data

    // Cookie-based client ONLY for auth identity
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const cookieStore = await cookies()
    const crewToken = cookieStore.get('crew_session_token')?.value
    const activeUserId = user?.id || crewToken

    if (!activeUserId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Admin client for all DB operations — bypasses RLS
    const db = createAdminClient()

    // Fetch the job and verify assignment
    const { data: job, error: jobErr } = await db
      .from('jobs')
      .select('id, assigned_to, status')
      .eq('id', parsedJobId)
      .single()

    if (jobErr || !job) {
      return { success: false, error: 'Job not found.' }
    }

    if (job.assigned_to !== activeUserId) {
      return { success: false, error: 'Access denied. This job is not assigned to you.' }
    }

    if (job.status === 'completed') {
      return { success: false, error: 'This job has already been completed.' }
    }

    // Prepare response rows for database insertion
    const responseRows = parsedResponses.map((r) => ({
      job_id: parsedJobId,
      item_id: r.itemId,
      checked: r.checked,
      photo_path: r.photoPath || null,
      gps_lat: r.gpsLat !== null ? Number(r.gpsLat) : null,
      gps_lng: r.gpsLng !== null ? Number(r.gpsLng) : null,
    }))

    // Insert response rows
    const { error: insertErr } = await db
      .from('job_responses')
      .insert(responseRows)

    if (insertErr) {
      return { success: false, error: `Failed to save responses: ${insertErr.message}` }
    }

    // Update job status to completed
    const { error: updateErr } = await db
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', parsedJobId)

    if (updateErr) {
      return { success: false, error: `Failed to complete job: ${updateErr.message}` }
    }

    // Revalidate routes
    revalidatePath('/crew/jobs')
    revalidatePath(`/crew/jobs/${parsedJobId}`)
    revalidatePath('/jobs')
    revalidatePath(`/jobs/${parsedJobId}`)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
