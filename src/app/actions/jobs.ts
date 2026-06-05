'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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

    // Handle custom checklist items creation
    if (parsedCustomChecklist && parsedCustomChecklist.items.length > 0) {
      const templateName = parsedCustomChecklist.name?.trim() || `Ad-hoc: ${parsedTitle}`

      // 1. Create the checklist template (admin client bypasses RLS)
      const { data: newTemplate, error: templateErr } = await db
        .from('checklist_templates')
        .insert({
          name: templateName,
          org_id: profile.org_id,
          created_by: user.id,
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
