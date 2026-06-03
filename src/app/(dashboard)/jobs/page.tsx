import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CreateJobForm } from './CreateJobForm'
import { JobsListClient } from './JobsListClient'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client so RLS never blocks reading org_id
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user!.id)
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

  // 1. Fetch organization jobs with template and crew names joined
  const { data: jobs, error: jobsErr } = await db
    .from('jobs')
    .select(`
      *,
      checklist_templates!template_id (id, name),
      profiles!assigned_to (id, full_name)
    `)
    .eq('org_id', profile.org_id)
    .order('scheduled_at', { ascending: true })

  // 2. Fetch templates for dropdown menu selection
  const { data: templates } = await db
    .from('checklist_templates')
    .select('id, name')
    .eq('org_id', profile.org_id)
    .not('name', 'ilike', 'Ad-hoc:%')
    .order('name', { ascending: true })

  // 3. Fetch crew members for dropdown assignment selection
  const { data: crew } = await db
    .from('profiles')
    .select('id, full_name')
    .eq('org_id', profile.org_id)
    .eq('role', 'crew')
    .order('full_name', { ascending: true })

  if (jobsErr) {
    console.error('Error fetching jobs:', jobsErr.message)
  }

  const jobsList = (jobs || []) as any[]
  const templatesList = templates || []
  const crewList = crew || []

  return (
    <div className="space-y-8 text-[#09090B]">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] block mb-2">Operations</span>
          <h1 className="text-3xl font-black tracking-tight text-[#09090B] leading-none">
            Job Dispatching
          </h1>
        </div>
        <div>
          <CreateJobForm templates={templatesList} crew={crewList} />
        </div>
      </div>

      {/* Jobs Overview Client Panel */}
      <JobsListClient initialJobs={jobsList} />
    </div>
  )
}
