import * as React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, ChevronRight, ClipboardList } from 'lucide-react'
import { cookies } from 'next/headers'
import { StatusPill } from '@/components/ui/status-pill'

export const dynamic = 'force-dynamic'

interface JobWithTemplate {
  id: string
  title: string
  location: string
  scheduled_at: string
  status: 'pending' | 'in_progress' | 'completed'
  templates: {
    name: string
  } | null
}

export default async function CrewJobsPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cookieStore = await cookies()
  const crewToken = cookieStore.get('crew_session_token')?.value
  const activeUserId = user?.id || crewToken

  if (!activeUserId) {
    redirect('/login')
  }

  // 2. Fetch assigned pending and in-progress jobs (using admin client to bypass RLS for passcode users)
  const db = createAdminClient()
  const { data: rawJobs, error: jobsError } = await db
    .from('jobs')
    .select('id, title, location, scheduled_at, status, template_id')
    .eq('assigned_to', activeUserId)
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_at', { ascending: true })

  let jobs: JobWithTemplate[] = []

  if (rawJobs && rawJobs.length > 0) {
    const templateIds = Array.from(new Set(rawJobs.map(j => j.template_id).filter(Boolean)))
    let templatesMap: Record<string, string> = {}
    
    if (templateIds.length > 0) {
      // Fetch from templates table
      const { data: sysRes } = await db.from('templates').select('id, name').in('id', templateIds)
      
      const allTemplates = sysRes || []
      allTemplates.forEach(t => {
        templatesMap[t.id] = t.name
      })
    }

    jobs = rawJobs.map(j => ({
      id: j.id,
      title: j.title,
      location: j.location,
      scheduled_at: j.scheduled_at,
      status: j.status,
      templates: j.template_id ? { name: templatesMap[j.template_id] || '' } : null
    }))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12 bg-[#FFFFFF]">
      {/* iOS-Style Page Header */}
      <div className="px-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#09090B]">
          Assigned Jobs
        </h1>
        <p className="text-[#71717A] text-sm mt-1">
          Select a job to view and complete the checklist.
        </p>
      </div>

      {jobsError && (
        <div className="mx-6 p-4 border border-[#E4E4E7] bg-[#FAFAFA] text-[#EF4444] text-sm font-medium">
          Failed to fetch jobs. Please try refreshing.
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="mx-6 py-16 flex flex-col items-center justify-center text-center border-t border-[#E4E4E7]">
          <ClipboardList className="h-10 w-10 text-[#E4E4E7] mb-4" />
          <h3 className="text-sm font-bold text-[#09090B]">No active jobs</h3>
          <p className="text-[#71717A] text-sm max-w-xs mt-1">
            You're all caught up! There are no pending jobs assigned to you right now.
          </p>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border-y border-[#E4E4E7] sm:border sm:rounded-xl sm:mx-6 overflow-hidden shadow-md">
          {jobs.map((job, index) => {
            const date = new Date(job.scheduled_at)
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })

            const isLast = index === jobs.length - 1

            return (
              <Link href={`/crew/jobs/${job.id}`} key={job.id} className="block group active:scale-[0.98] transition-transform duration-75">
                <div className={`flex items-center p-4 bg-[#FFFFFF] hover:bg-[#FAFAFA] transition-colors ${!isLast ? 'border-b border-[#E4E4E7]' : ''}`}>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-semibold text-[#09090B] text-base truncate">
                        {job.title}
                      </h2>
                      {job.status === 'in_progress' ? (
                        <StatusPill variant="in_progress">In Progress</StatusPill>
                      ) : job.status === 'completed' ? (
                        <StatusPill variant="completed">Completed</StatusPill>
                      ) : (
                        <StatusPill variant="pending">Pending</StatusPill>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-[#71717A] gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formattedDate}, {formattedTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <ChevronRight className="h-5 w-5 text-[#E4E4E7] group-hover:text-[#71717A] transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
