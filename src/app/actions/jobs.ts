'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from './templates'
import { assertPremiumServer } from '@/lib/subscription'

interface CustomChecklistItem {
  label: string
  requiresPhoto: boolean
}

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
    items: CustomChecklistItem[]
  }
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()
    if (!title.trim() || !location.trim() || !assignedTo || !scheduledAt) {
      return { success: false, error: 'Title, location, assigned crew, and schedule are required.' }
    }

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

    let finalTemplateId = templateId

    // Handle custom checklist items creation
    if (customChecklist && customChecklist.items.length > 0) {
      const templateName = customChecklist.name?.trim() || `Ad-hoc: ${title.trim()}`

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
      const itemRows = customChecklist.items.map((item, index) => ({
        template_id: finalTemplateId,
        label: item.label.trim(),
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
        title: title.trim(),
        location: location.trim(),
        template_id: finalTemplateId,
        assigned_to: assignedTo,
        scheduled_at: scheduledAt,
        org_id: profile.org_id,
        created_by: user.id,
        status: 'pending',
        client_email: '', // Default to empty string as required by schema
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/jobs')
    revalidatePath('/templates')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}
