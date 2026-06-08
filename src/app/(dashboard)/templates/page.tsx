import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assertPremiumServer } from '@/lib/subscription'
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

  await assertPremiumServer()

  // Resolve user profile for isolation via admin client to bypass RLS recursion
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  let templates: any[] = []

  if (profile?.org_id) {
    const { data, error } = await db
      .from('checklist_templates')
      .select(`
        id, name, description, org_id, created_at,
        template_items (id)
      `)
      .eq('org_id', profile.org_id)
      .not('name', 'ilike', 'Ad-hoc:%')
      .order('created_at', { ascending: false })

    if (!error && data) {
      templates = data
    }
  }

  return (
    <div className="space-y-8 relative">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Management</span>
          <h1 className="text-3xl font-black tracking-tight text-[#09090B] mt-1">Standard Cleaning Templates</h1>
          <p className="text-[#71717A] mt-1 text-sm">
            Assign these pre-built workflows to your active dispatch routes.
          </p>
        </div>
        <CreateTemplateDialog />
      </div>

      <TemplatesListClient initialTemplates={templates} />
    </div>
  )
}
