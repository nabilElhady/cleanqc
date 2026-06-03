import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DispatchBoardClient } from './DispatchBoardClient'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
  const supabase = await createClient()

  // 1. Authenticate session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Resolve profile and role checks
  const { data: profile } = await supabase
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

  // 3. Fetch initial jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      checklist_templates!template_id (id, name),
      profiles!assigned_to (id, full_name)
    `)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  // 4. Fetch checklist templates
  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('id, name')
    .eq('org_id', profile.org_id)
    .order('name', { ascending: true })

  // 5. Fetch crew list
  const { data: crew } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('org_id', profile.org_id)
    .eq('role', 'crew')
    .order('full_name', { ascending: true })

  return (
    <DispatchBoardClient
      orgId={profile.org_id}
      initialJobs={(jobs || []) as any}
      templates={templates || []}
      crew={crew || []}
    />
  )
}
