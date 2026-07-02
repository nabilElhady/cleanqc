import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DispatchBoardClient } from './DispatchBoardClient'

export const dynamic = 'force-dynamic'

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const supabase = await createClient()
  const params = await searchParams
  const initialTemplateId = params.templateId || ''

  // 1. Authenticate session (always use cookie-based client for auth identity)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Use admin client to read profile — bypasses RLS so org_id is never null
  //    This matches the pattern used in dashboard/page.tsx and middleware.ts
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return (
      <div className="text-[#09090B] text-center p-8 bg-[#FFFFFF] border border-[#E4E4E7] max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-bold">No Organization Assigned</h3>
        <p className="text-[#71717A] text-sm mt-2">
          Your profile is not associated with any organization. Please contact support.
        </p>
      </div>
    )
  }

  // Only allow owners and managers to access dispatch controls
  if (profile.role !== 'owner' && profile.role !== 'manager') {
    return (
      <div className="text-[#09090B] text-center p-8 bg-[#FFFFFF] border border-red-500 max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-bold text-red-600">Access Denied</h3>
        <p className="text-[#71717A] text-sm mt-2 uppercase font-mono tracking-wider">
          Only managers or owners are authorized to access the dispatch system.
        </p>
      </div>
    )
  }

  // 3. Fetch initial jobs (use admin client for consistency within this org scope)
  const { data: rawJobs } = await db
    .from('jobs')
    .select(`
      *,
      profiles!assigned_to (id, full_name)
    `)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  // 4a. Fetch custom checklist templates (uses organization_id)
  const { data: customTemplatesRaw } = await db
    .from('templates')
    .select('id, name')
    .eq('organization_id', profile.org_id)
    .order('name', { ascending: true })

  // Fetch items for custom templates
  let customTemplates: any[] = []
  if (customTemplatesRaw && customTemplatesRaw.length > 0) {
    const customIds = customTemplatesRaw.map(t => t.id)
    const { data: customItems } = await db
      .from('template_items')
      .select('template_id, label, requires_photo')
      .in('template_id', customIds)
      .order('sort_order', { ascending: true })

    customTemplates = customTemplatesRaw.map(t => ({
      ...t,
      is_system: false,
      template_items: customItems?.filter(i => i.template_id === t.id) || []
    }))
  }

  // 4b. Fetch system templates
  const { data: systemTemplates } = await db
    .from('templates')
    .select('id, name, items')
    .eq('is_system', true)
    .order('name', { ascending: true })

  // 4c. Merge both into a unified list
  const templates = [...(customTemplates || []), ...(systemTemplates || [])]

  // 5. Fetch crew list (allow assigning to anyone in the org, including managers/owners for easy testing)
  const { data: crew } = await db
    .from('profiles')
    .select('id, full_name')
    .eq('org_id', profile.org_id)
    .order('full_name', { ascending: true })

  // Map rawJobs to include template info
  const jobs = rawJobs?.map((job) => {
    const matchedTemplate = templates.find(t => t.id === job.template_id)
    return {
      ...job,
      templates: matchedTemplate ? { id: matchedTemplate.id, name: matchedTemplate.name } : null
    }
  })

  return (
    <DispatchBoardClient
      orgId={profile.org_id}
      initialJobs={(jobs || []) as any}
      templates={templates || []}
      crew={crew || []}
      initialTemplateId={initialTemplateId}
    />
  )
}
