'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertPremiumServer } from '@/lib/subscription'

export type ActionResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Helper to fetch the current authenticated user's organization ID.
 */
async function getOrganizationId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.org_id) {
    throw new Error('Organization not found for current user profile.')
  }

  return profile.org_id
}

/**
 * Creates a new checklist template for the current user's organization.
 */
export async function createTemplate(
  name: string,
  description: string
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()
    if (!name.trim()) {
      return { success: false, error: 'Template name is required.' }
    }

    const supabase = await createClient()
    const orgId = await getOrganizationId(supabase)

    const { data, error } = await supabase
      .from('checklist_templates')
      .insert({
        name: name.trim(),
        description: description.trim(),
        org_id: orgId,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/templates')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Adds a checklist item to a specific template, placing it at the end of the sorted list.
 */
export async function addTemplateItem(
  templateId: string,
  label: string,
  requiresPhoto: boolean
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()
    if (!label.trim()) {
      return { success: false, error: 'Item label is required.' }
    }

    const supabase = await createClient()

    // Determine the next sort order value
    const { data: maxItem, error: fetchError } = await supabase
      .from('template_items')
      .select('sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const nextSortOrder = maxItem ? maxItem.sort_order + 1 : 0

    const { data, error } = await supabase
      .from('template_items')
      .insert({
        template_id: templateId,
        label: label.trim(),
        requires_photo: requiresPhoto,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/templates/${templateId}`)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Updates the sort_order of template items after a drag-and-drop reordering.
 */
export async function updateItemOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()
    const supabase = await createClient()

    // Perform updates in parallel
    const promises = items.map((item) =>
      supabase
        .from('template_items')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    )

    const results = await Promise.all(promises)
    const firstError = results.find((res) => res.error)?.error

    if (firstError) {
      return { success: false, error: firstError.message }
    }

    // Revalidate templates path pattern
    revalidatePath('/templates/[id]', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}
