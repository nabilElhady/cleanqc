'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { ActionResponse } from './templates'
import { assertPremiumServer } from '@/lib/subscription'
import { z } from 'zod'

const ChecklistItemSchema = z.object({
  label: z.string().min(1).max(200).trim(),
  requiresPhoto: z.boolean(),
})

const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200).trim(),
  location: z.string().min(1, 'Location is required.').max(300).trim(),
  assignedTo: z.string().uuid('Invalid crew member ID.'),
  scheduledAt: z.string().datetime({ message: 'Invalid schedule date.' }),
  templateId: z.string().uuid('Invalid template ID.').optional().or(z.literal('')),
  customChecklist: z.object({
    name: z.string().max(200).trim().optional(),
    saveAsTemplate: z.boolean(),
    items: z.array(ChecklistItemSchema).min(1).max(50),
  }).optional(),
})

/**
 * Creates a new job dispatch record, supporting either an existing template
 * or dynamically building a custom checklist.
 */
export async function createJob(
  title: string,
  location: string,
  assignedTo: string,
  scheduledAt: string, // ISO string timestamp
  templateId?: string,
  customChecklist?: {
    name?: string
    saveAsTemplate: boolean
    items: { label: string; requiresPhoto: boolean }[]
  }
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()

    const validatedFields = CreateJobSchema.safeParse({
      title,
      location,
      assignedTo,
      scheduledAt,
      templateId,
      customChecklist,
    })

    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const {
      title: parsedTitle,
      location: parsedLocation,
      assignedTo: parsedAssignedTo,
      scheduledAt: parsedScheduledAt,
      templateId: parsedTemplateId,
      customChecklist: parsedCustomChecklist,
    } = validatedFields.data

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Resolve current user profile for role & organization context via admin client to bypass RLS recursion
    const db = createAdminClient()
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.org_id) {
      return { success: false, error: 'Could not resolve organization.' }
    }

    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return { success: false, error: 'Only managers can create and dispatch jobs.' }
    }

    let finalTemplateId = parsedTemplateId

    // Handle system templates by cloning them into real templates with template_items
    if (finalTemplateId) {
      const { data: tmpl } = await db.from('templates').select('is_system, name, items').eq('id', finalTemplateId).single()
      if (tmpl && tmpl.is_system) {
        const { data: newTemplate, error: templateErr } = await db.from('templates').insert({
          name: tmpl.name,
          organization_id: profile.org_id,
        }).select('id').single()
        
        if (templateErr || !newTemplate) {
          return { success: false, error: `Failed to clone system template: ${templateErr?.message}` }
        }
        
        finalTemplateId = newTemplate.id
        
        let sortOrder = 1
        const itemRows = []
        const systemSections = (tmpl.items as any[]) || []
        for (const sec of systemSections) {
          for (const task of sec.tasks || []) {
            itemRows.push({
              template_id: finalTemplateId,
              label: `[${sec.section}] ${task.label}`,
              requires_photo: task.requiresPhoto || false,
              sort_order: sortOrder++,
            })
          }
        }
        
        if (itemRows.length > 0) {
          await db.from('template_items').insert(itemRows)
        }
      }
    }

    // Handle custom checklist items creation
    if (parsedCustomChecklist && parsedCustomChecklist.items.length > 0) {
      const templateName = parsedCustomChecklist.name?.trim() || `Ad-hoc: ${parsedTitle}`

      // 1. Create the checklist template (admin client bypasses RLS)
      const { data: newTemplate, error: templateErr } = await db
        .from('templates')
        .insert({
          name: templateName,
          organization_id: profile.org_id,
        })
        .select('id')
        .single()

      if (templateErr || !newTemplate) {
        return { success: false, error: `Failed to create custom template: ${templateErr?.message}` }
      }

      finalTemplateId = newTemplate.id

      // 2. Insert the checklist items
      const itemRows = parsedCustomChecklist.items.map((item, index) => ({
        template_id: finalTemplateId,
        label: item.label,
        requires_photo: item.requiresPhoto,
        sort_order: index + 1,
      }))

      const { error: itemsErr } = await db
        .from('template_items')
        .insert(itemRows)

      if (itemsErr) {
        return { success: false, error: `Failed to save checklist items: ${itemsErr.message}` }
      }
    }

    if (!finalTemplateId) {
      return { success: false, error: 'Please select a template or build a custom checklist.' }
    }

    // Create the Job dispatch (admin client bypasses RLS)
    const { data, error } = await db
      .from('jobs')
      .insert({
        title: parsedTitle,
        location: parsedLocation,
        template_id: finalTemplateId,
        assigned_to: parsedAssignedTo,
        scheduled_at: parsedScheduledAt,
        org_id: profile.org_id,
        created_by: user.id,
        status: 'pending',
        client_email: '', // Default to empty string as required by schema
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/jobs')
    revalidatePath('/templates')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/dispatch')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Updates a job's status securely via the admin client to bypass RLS recursion issues.
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: 'pending' | 'active' | 'in_progress' | 'completed' | 'cancelled'
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized.' }
    }

    // Use admin client to bypass any RLS recursion during the update
    const db = createAdminClient()
    
    // Verify user is manager/owner
    const { data: profile } = await db
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    // Crew members can also update job status, so we allow crew, manager, or owner
    if (!profile) {
      return { success: false, error: 'Profile not found.' }
    }

    const { error } = await db
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId)
      .eq('org_id', profile.org_id) // ensure they only update within their org

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/jobs')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/dispatch')
    revalidatePath('/crew/jobs')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update job status.' }
  }
}

/**
 * Generates a Signed Upload URL for a crew member or manager to upload a job proof photo,
 * bypassing RLS restrictions for users on stateless sessions.
 */
export async function getSignedUploadUrl(
  orgId: string,
  jobId: string,
  itemId: string,
  fileExtension: string
): Promise<{ success: boolean; signedUrl?: string; token?: string; path?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const cookieStore = await cookies()
    const crewToken = cookieStore.get('crew_session_token')?.value

    if (!user && !crewToken) {
      return { success: false, error: 'Unauthorized.' }
    }

    const db = createAdminClient()
    let authorized = false
    
    if (crewToken) {
       const { data: job } = await db.from('jobs').select('assigned_to').eq('id', jobId).single()
       if (job && job.assigned_to === crewToken) {
         authorized = true
       }
    } else if (user) {
       const { data: profile } = await db.from('profiles').select('org_id').eq('id', user.id).single()
       if (profile && profile.org_id === orgId) {
         authorized = true
       }
    }

    if (!authorized) {
      return { success: false, error: 'Not authorized to upload for this job.' }
    }

    const storagePath = `${orgId}/${jobId}/${itemId}.${fileExtension}`

    const { data, error } = await db.storage
      .from('job-proofs')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to generate upload URL.' }
    }

    return { 
      success: true, 
      signedUrl: data.signedUrl, 
      token: data.token, 
      path: data.path 
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}
