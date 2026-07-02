'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  requiresUpgrade?: boolean
}

const STANDARD_TEMPLATES_DATA: Record<string, { name: string, description: string, items: {label: string, requiresPhoto: boolean}[] }> = {
  'std-1': {
    name: 'Daily Office Cleaning',
    description: 'Standard daily workflow covering workspaces, breakrooms, and security checks.',
    items: [
      { label: 'Empty all trash receptacles and replace liners.', requiresPhoto: false },
      { label: 'Vacuum all carpeted areas and rugs.', requiresPhoto: false },
      { label: 'Sweep and mop all hard surface floors.', requiresPhoto: false },
      { label: 'Dust all cleared horizontal surfaces.', requiresPhoto: false },
      { label: 'Wipe down breakroom counters, sink, and tables.', requiresPhoto: true },
      { label: 'Clean and sanitize restroom toilets and sinks.', requiresPhoto: true },
      { label: 'Restock restroom supplies (paper towels, soap, toilet paper).', requiresPhoto: false },
      { label: 'Ensure all doors are locked and security alarms set before leaving.', requiresPhoto: false },
    ]
  },
  'std-2': {
    name: 'Restroom Sanitation',
    description: 'Strict hygiene checklist for cleaning, disinfecting, and restocking restrooms.',
    items: [
      { label: 'Clean and disinfect all toilets and urinals (inside and out).', requiresPhoto: false },
      { label: 'Clean and polish sinks, mirrors, and fixtures (no streaks).', requiresPhoto: false },
      { label: 'Sweep and wet-mop floors with disinfectant.', requiresPhoto: false },
      { label: 'Refill toilet paper and hand soap dispensers.', requiresPhoto: true },
      { label: 'Empty sanitary bins and replace liners.', requiresPhoto: false },
    ]
  },
  'std-3': {
    name: 'Monthly Deep Clean',
    description: 'Intensive monthly tasks including high dusting, baseboards, and deep floor care.',
    items: [
      { label: 'High dusting of ceiling corners, vents, and light fixtures.', requiresPhoto: false },
      { label: 'Wipe down all baseboards and door frames.', requiresPhoto: true },
      { label: 'Deep scrub and polish all hard surface floors.', requiresPhoto: true },
      { label: 'Clean interior windows and glass partitions.', requiresPhoto: false },
      { label: 'Vacuum all upholstered furniture.', requiresPhoto: false },
      { label: 'Sanitize all high-touch areas (light switches, door handles, elevator buttons).', requiresPhoto: false },
    ]
  }
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
async function getOrganizationAndTier(supabase: any): Promise<{ orgId: string; tier: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = createAdminClient()
  const { data: profile, error } = await db
    .from('profiles')
    .select('org_id, organizations!inner(subscription_tier)')
    .eq('id', user.id)
    .single()

  if (error || !profile?.org_id) {
    const detail = error ? ` DB Error: ${error.message} (code: ${error.code})` : ' Profile org_id is null/empty.'
    throw new Error(`Organization not found for current user profile.${detail}`)
  }

  const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
  const tier = org?.subscription_tier || 'starter';

  return { orgId: profile.org_id, tier }
}

/**
 * Helper to check template limits for an organization.
 */
async function checkTemplateLimits(orgId: string, tier: string, supabaseAdmin: any): Promise<{ allowed: boolean; error?: string }> {

  const { count, error } = await supabaseAdmin
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .not('name', 'ilike', 'Ad-hoc:%')

  if (error) return { allowed: false, error: `Could not fetch current template usage: ${error.message || JSON.stringify(error)}` }

  const templateCount = count || 0

  if (tier === 'starter' && templateCount >= 3) return { allowed: false, error: 'Starter tier is limited to 3 custom templates.' }
  if (tier === 'growth' && templateCount >= 20) return { allowed: false, error: 'Growth tier is limited to 20 custom templates.' }

  return { allowed: true }
}

/**
 * Creates a new checklist template for the current user's organization.
 */
export async function createTemplate(
  name: string,
  description: string
): Promise<ActionResponse> {
  try {
    const validatedFields = CreateTemplateSchema.safeParse({ name, description })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { name: parsedName, description: parsedDescription } = validatedFields.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { orgId, tier } = await getOrganizationAndTier(supabase)

    // Use admin client to bypass RLS on checklist_templates
    const db = createAdminClient()
    
    // Check template limits before proceeding
    const limitCheck = await checkTemplateLimits(orgId, tier, db)
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error, requiresUpgrade: true }
    }

    const { data, error } = await db
      .from('templates')
      .insert({
        name: parsedName,
        description: parsedDescription,
        organization_id: orgId,
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
 * Copies a standard template from the templates table to the organization's custom templates.
 */
export async function copyStandardTemplate(
  stdId: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { orgId, tier } = await getOrganizationAndTier(supabase)
    const db = createAdminClient()

    // 1. Fetch the standard template from the DB
    const { data: stdTemplate, error: fetchErr } = await db
      .from('templates')
      .select('name, description, items')
      .eq('id', stdId)
      .eq('is_system', true)
      .single()

    if (fetchErr || !stdTemplate) {
      return { success: false, error: 'Standard template not found in database.' }
    }

    // 2. Check limits
    const limitCheck = await checkTemplateLimits(orgId, tier, db)
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error, requiresUpgrade: true }
    }

    // 3. Create the custom template copy
    const { data: newTemplate, error: insertErr } = await db
      .from('templates')
      .insert({
        name: stdTemplate.name,
        description: stdTemplate.description,
        organization_id: orgId,
      })
      .select('id')
      .single()

    if (insertErr || !newTemplate) {
      return { success: false, error: insertErr?.message || 'Failed to copy template.' }
    }

    // 4. Parse JSONB items and insert them into template_items
    // Structure of items JSONB is expected to be array of sections, each having tasks:
    // [{ section: "Section Name", tasks: [{ label: "Task name", requiresPhoto: false }] }]
    const sections = Array.isArray(stdTemplate.items) ? stdTemplate.items : []
    const itemRows: any[] = []
    let sortOrder = 1

    sections.forEach((sec: any) => {
      const sectionName = sec.section || ''
      const tasks = Array.isArray(sec.tasks) ? sec.tasks : []
      
      tasks.forEach((task: any) => {
        // Prepend section name to task label for checklist flat model if needed, or keep label as is
        const label = sectionName ? `[${sectionName}] ${task.label}` : task.label
        itemRows.push({
          template_id: newTemplate.id,
          label: label,
          requires_photo: !!task.requiresPhoto,
          sort_order: sortOrder++,
        })
      })
    })

    if (itemRows.length > 0) {
      const { error: itemsErr } = await db
        .from('template_items')
        .insert(itemRows)

      if (itemsErr) {
        return { success: false, error: `Failed to save checklist items: ${itemsErr.message}` }
      }
    }

    revalidatePath('/templates')
    revalidatePath('/dashboard')
    return { success: true, data: newTemplate }
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
    const validatedFields = AddTemplateItemSchema.safeParse({ templateId, label, requiresPhoto })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { templateId: parsedTemplateId, label: parsedLabel, requiresPhoto: parsedRequiresPhoto } = validatedFields.data

    const db = createAdminClient()

    // Determine the next sort order value
    const { data: maxItem, error: fetchError } = await db
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

    const { data, error } = await db
      .from('template_items')
      .insert({
        template_id: parsedTemplateId,
        label: parsedLabel,
        requires_photo: parsedRequiresPhoto,
        sort_order: nextSortOrder,
      })
      .select('id, template_id, label, requires_photo, sort_order')
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
    const validatedFields = UpdateItemOrderSchema.safeParse({ items })
    if (!validatedFields.success) {
      const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ')
      return { success: false, error: errorMsg }
    }

    const { items: parsedItems } = validatedFields.data
    const db = createAdminClient()

    // Extract item IDs to perform bulk select
    const itemIds = parsedItems.map((item) => item.id)

    // 1. Fetch full records for the items being updated (to keep all NOT NULL columns when upserting)
    const { data: existingItems, error: fetchError } = await db
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
    const { error: upsertError } = await db
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

/**
 * Deletes a template and all its associated items.
 */
export async function deleteTemplate(templateId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { orgId } = await getOrganizationAndTier(supabase)
    const db = createAdminClient()

    // Ensure the template belongs to the current organization
    const { data: template, error: fetchErr } = await db
      .from('templates')
      .select('id, organization_id')
      .eq('id', templateId)
      .single()

    if (fetchErr || !template) {
      return { success: false, error: 'Template not found.' }
    }

    if (template.organization_id !== orgId) {
      return { success: false, error: 'Unauthorized to delete this template.' }
    }

    // Delete the template (items are cascaded or we delete them explicitly)
    await db.from('template_items').delete().eq('template_id', templateId)

    const { error: deleteErr } = await db
      .from('templates')
      .delete()
      .eq('id', templateId)

    if (deleteErr) {
      return { success: false, error: deleteErr.message }
    }

    revalidatePath('/templates')
    revalidatePath('/dashboard/dispatch')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' }
  }
}
