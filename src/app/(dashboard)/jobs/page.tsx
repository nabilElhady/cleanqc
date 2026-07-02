import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { assertPremiumServer } from '@/lib/subscription'
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

  await assertPremiumServer()

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

  // 1. Parallelize fetching organization jobs, templates, and crew members
  const [jobsRes, templatesRes, crewRes] = await Promise.all([
    db
      .from('jobs')
      .select(`
        id, title, location, status, scheduled_at, completed_at, template_id, assigned_to, org_id,
        profiles!assigned_to (id, full_name)
      `)
      .eq('org_id', profile.org_id)
      .order('scheduled_at', { ascending: true }),
      
    db
      .from('templates')
      .select('id, name')
      .or(`organization_id.eq.${profile.org_id},is_system.eq.true`)
      .not('name', 'ilike', 'Ad-hoc:%')
      .order('name', { ascending: true }),
      
    db
      .from('profiles')
      .select('id, full_name')
      .eq('org_id', profile.org_id)
      .eq('role', 'crew')
      .order('full_name', { ascending: true })
  ])

  const { data: jobs, error: jobsErr } = jobsRes
  const { data: orgTemplates } = templatesRes
  const { data: crew } = crewRes

  const templatesList = orgTemplates || []

  if (jobsErr) {
    console.error('Error fetching jobs:', jobsErr.message)
  }

  const rawJobs = jobs || []
  const jobsList = rawJobs.map((job: any) => {
    const matchedTemplate = templatesList.find(t => t.id === job.template_id)
    return {
      ...job,
      templates: matchedTemplate ? { id: matchedTemplate.id, name: matchedTemplate.name } : null,
      profiles: Array.isArray(job.profiles) ? job.profiles[0] : job.profiles,
    }
  })

  const crewList = crew || []

  return (
    <div className="space-y-8 text-[#09090B]">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] block mb-2">Operations</span>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[#09090B]">
            Job History
          </h1>
          <p className="text-[#71717A] text-sm mt-2">All jobs sent to your crew. Click any completed job to view the photo report.</p>
        </div>
        <div>
        </div>
      </div>

      {/* Jobs Overview Client Panel */}
      <JobsListClient initialJobs={jobsList} />
    </div>
  )
}
