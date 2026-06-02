import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Resolve user profile for organization isolation
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return (
      <div className="text-[#FAFAFA] text-center p-8 bg-[#18181B] border border-white/8 rounded-2xl max-w-lg mx-auto mt-12 shadow-2xl">
        <h3 className="text-lg font-bold">No Organization Assigned</h3>
        <p className="text-[#A1A1AA] text-sm mt-2">
          Your profile is not associated with any organization. Please contact support.
        </p>
      </div>
    )
  }

  // Fetch count statistics
  const [jobsRes, templatesRes, teamRes] = await Promise.all([
    supabase.from('jobs').select('id, status').eq('org_id', profile.org_id),
    supabase.from('checklist_templates').select('id').eq('org_id', profile.org_id),
    supabase.from('profiles').select('id').eq('org_id', profile.org_id),
  ])

  const allJobs = jobsRes.data || []
  const activeJobsCount = allJobs.filter(j => j.status === 'in_progress').length
  const completedJobsCount = allJobs.filter(j => j.status === 'completed').length
  const pendingJobsCount = allJobs.filter(j => j.status === 'pending').length

  const templatesCount = templatesRes.data?.length || 0
  const teamCount = teamRes.data?.length || 0

  return (
    <DashboardClient
      userEmail={user.email || ''}
      activeJobsCount={activeJobsCount}
      pendingJobsCount={pendingJobsCount}
      completedJobsCount={completedJobsCount}
      templatesCount={templatesCount}
      teamCount={teamCount}
    />
  )
}
