'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertPremiumServer } from '@/lib/subscription'
import { z } from 'zod'

export type ActionResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required.').max(100).trim(),
  description: z.string().max(500).trim().optional().or(z.literal('')),
})

const AddTemplateItemSchema = z.object({
  templateId: z.string().uuid('Invalid template ID.'),
  label: z.string().min(1, 'Item label is required.').max(200).trim(),
  requiresPhoto: z.boolean(),
})

const UpdateItemOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('Invalid item ID.'),
      sort_order: z.number().int().nonnegative(),
    })
  ).min(1).max(200),
})

/**
 * Helper to fetch the current authenticated user's organization ID.
 */
async function getOrganizationId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = createAdminClient()
  const { data: profile, error } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.org_id) {
    const detail = error ? ` DB Error: ${error.message} (code: ${error.code})` : ' Profile org_id is null/empty.'
    throw new Error(`Organization not found for current user profile.${detail}`)
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

    const validatedFields = CreateTemplateSchema.safeParse({ name, description })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { name: parsedName, description: parsedDescription } = validatedFields.data

    const supabase = await createClient()
    const orgId = await getOrganizationId(supabase)

    // Use admin client to bypass RLS on checklist_templates
    const db = createAdminClient()
    const { data, error } = await db
      .from('checklist_templates')
      .insert({
        name: parsedName,
        description: parsedDescription,
        org_id: orgId,
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/templates')
    revalidatePath('/dashboard')
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

    const validatedFields = AddTemplateItemSchema.safeParse({ templateId, label, requiresPhoto })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { templateId: parsedTemplateId, label: parsedLabel, requiresPhoto: parsedRequiresPhoto } = validatedFields.data

    const supabase = await createClient()

    // Determine the next sort order value
    const { data: maxItem, error: fetchError } = await supabase
      .from('template_items')
      .select('sort_order')
      .eq('template_id', parsedTemplateId)
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
        template_id: parsedTemplateId,
        label: parsedLabel,
        requires_photo: parsedRequiresPhoto,
        sort_order: nextSortOrder,
      })
      .select('id, template_id, label, requires_photo, sort_order, created_at')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/templates/${parsedTemplateId}`)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}

/**
 * Updates the sort_order of template items after a drag-and-drop reordering.
 * Optimized from parallel N+1 update loop to a bulk select and atomic upsert.
 */
export async function updateItemOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResponse> {
  try {
    await assertPremiumServer()

    const validatedFields = UpdateItemOrderSchema.safeParse({ items })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { items: parsedItems } = validatedFields.data
    const supabase = await createClient()

    // Extract item IDs to perform bulk select
    const itemIds = parsedItems.map((item) => item.id)

    // 1. Fetch full records for the items being updated (to keep all NOT NULL columns when upserting)
    const { data: existingItems, error: fetchError } = await supabase
      .from('template_items')
      .select('id, template_id, label, requires_photo, sort_order')
      .in('id', itemIds)

    if (fetchError || !existingItems) {
      return {
        success: false,
        error: fetchError?.message || 'Failed to fetch existing checklist items.',
      }
    }

    // 2. Map the new sort orders onto the retrieved items
    const updatedItems = existingItems.map((item) => {
      const targetUpdate = parsedItems.find((p) => p.id === item.id)
      return {
        ...item,
        sort_order: targetUpdate ? targetUpdate.sort_order : item.sort_order,
      }
    })

    // 3. Perform a single batch upsert to atomically reorder
    const { error: upsertError } = await supabase
      .from('template_items')
      .upsert(updatedItems)

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    // Multi-tenant cache invalidation
    // Revalidate templates path pattern
    revalidatePath('/templates/[id]', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}
