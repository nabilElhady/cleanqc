import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { TemplatesListClient } from './TemplatesListClient'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Resolve user profile for isolation via admin client to bypass RLS recursion
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  let templates: any[] = []
  let systemTemplates: any[] = []
  let exactCount = 0
  let subscriptionTier = 'starter'

  if (profile?.org_id) {
    const { data: orgData } = await db
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.org_id)
      .single()

    if (orgData?.subscription_tier) {
      subscriptionTier = orgData.subscription_tier
    }

    const { data, error } = await db
      .from('templates')
      .select(`
        id, name, description, organization_id, created_at
      `)
      .eq('organization_id', profile.org_id)
      .not('name', 'ilike', 'Ad-hoc:%')
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Fetch item counts separately to avoid Supabase relationship errors
      const templateIds = data.map(t => t.id)
      const { data: itemsData } = await db
        .from('template_items')
        .select('id, template_id')
        .in('template_id', templateIds)
        
      templates = data.map(t => ({
        ...t,
        template_items: itemsData?.filter(i => i.template_id === t.id) || []
      }))
    }

    // Get exact count from DB (ignoring system templates and ad-hoc jobs)
    const { count } = await db
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.org_id)
      .not('name', 'ilike', 'Ad-hoc:%')

    if (count !== null) {
      exactCount = count
    }
  }

  // Fetch the new System Templates 
  const { data: sysData, error: sysErr } = await db
    .from('templates')
    .select('id, name, description, items')
    .eq('is_system', true)

  if (!sysErr && sysData) {
    systemTemplates = sysData
  }

  let templateLimit = 3
  if (subscriptionTier === 'growth') templateLimit = 20
  if (subscriptionTier === 'scale') templateLimit = Infinity

  const currentCount = exactCount
  const limitPercentage = templateLimit === Infinity ? 0 : Math.min((currentCount / templateLimit) * 100, 100)

  return (
    <div className="space-y-8 relative">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Management</span>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[#09090B]">Cleaning Templates</h1>
          <p className="text-[#71717A] mt-1 text-sm">
            Assign these pre-built workflows to your active dispatch routes.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Progress Bar for Limit */}
          <div className="w-full sm:w-48 bg-white border border-[#E4E4E7] shadow-sm p-3 rounded-lg">
             <div className="flex justify-between items-end mb-2">
               <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Template Usage</span>
               <span className="text-xs font-semibold text-[#09090B]">{currentCount} / {templateLimit === Infinity ? '∞' : templateLimit}</span>
             </div>
             <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
               <div className="h-full bg-[#09090B] rounded-full transition-all duration-500" style={{ width: `${limitPercentage}%` }} />
             </div>
          </div>
          <CreateTemplateDialog />
        </div>
      </div>

      <TemplatesListClient initialTemplates={templates} systemTemplates={systemTemplates} />
    </div>
  )
}
