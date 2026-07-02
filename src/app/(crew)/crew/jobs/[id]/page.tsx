import * as React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ChecklistForm from './ChecklistForm'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cookies } from 'next/headers'
import { StatusPill } from '@/components/ui/status-pill'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ActiveChecklistPage({ params }: PageProps) {
  const { id } = await params
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

  // 2. Fetch the job details (using admin client to bypass RLS for passcode users)
  const db = createAdminClient()
  const { data: rawJob, error: jobError } = await db
    .from('jobs')
    .select('id, title, location, status, org_id, assigned_to, template_id')
    .eq('id', id)
    .single()

  if (jobError || !rawJob) {
    notFound()
  }

  let template = null
  if (rawJob.template_id) {
    const { data: tData } = await db
      .from('templates')
      .select('id, name, items')
      .eq('id', rawJob.template_id)
      .single()
    
    if (tData) {
      template = tData
    }
  }

  const job = {
    ...rawJob,
    templates: template
  }

  // 3. Security check: Only assigned crew member can view
  if (job.assigned_to !== activeUserId) {
    return (
      <div className="space-y-4 text-center py-12 text-[#09090B]">
        <h2 className="text-xl font-bold text-rose-500">Access Denied</h2>
        <p className="text-[#71717A] text-sm">
          You are not authorized to view or edit this checklist.
        </p>
        <div className="pt-2">
          <Link href="/crew/jobs" passHref>
            <Button variant="outline">
               Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // 4. Job completed check
  if (job.status === 'completed') {
    return (
      <div className="space-y-6 py-6 text-[#09090B]">
        <Link href="/crew/jobs" className="inline-flex items-center text-sm text-[#71717A] hover:text-[#09090B] gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Jobs</span>
        </Link>

        <Card className="bg-white border-[#E4E4E7] shadow-sm py-12 px-4 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
              <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
            </div>
            <h3 className="font-semibold text-[#09090B] text-lg">Job Completed</h3>
            <p className="text-[#71717A] text-sm max-w-xs mx-auto">
              This checklist has already been submitted and the status is marked as completed.
            </p>
            <div className="pt-2">
              <Link href="/crew/jobs" passHref>
                <Button className="cursor-pointer bg-[#10B981] hover:bg-[#10B981]/90 text-white border-none shadow-sm">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 5. Fetch template items ordered by sort_order (using admin client to bypass RLS)
  let templateItems: any[] = []
  
  if (template && template.items && (template.items as any[]).length > 0) {
    // If we fell back to a system template, it will have 'items' as JSONB
    const systemSections = (template.items as any[])
    templateItems = systemSections.flatMap((sec, secIdx) => 
      (sec.tasks || []).map((task: any, taskIdx: number) => ({
        id: task.id || `${sec.section}-${secIdx}-${taskIdx}`,
        label: task.label,
        requires_photo: task.requiresPhoto || false,
        sort_order: secIdx * 1000 + taskIdx, // Ensure consistent ordering
      }))
    )
  } else if (job.template_id) {
    const { data: items, error: itemsError } = await db
      .from('template_items')
      .select('id, label, requires_photo, sort_order')
      .eq('template_id', job.template_id)
      .order('sort_order', { ascending: true })

    templateItems = items || []
  }

  // 6. Update job status to 'in_progress' if it is currently 'pending'
  if (job.status === 'pending') {
    await db
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', job.id)
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-[#E4E4E7] shadow-md p-4 sm:p-6 rounded-xl space-y-6 text-[#09090B]">
      <Link href="/crew/jobs" className="inline-flex items-center text-sm text-[#71717A] hover:text-[#09090B] gap-1 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Jobs</span>
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#09090B]">{job.title}</h1>
        <p className="text-[#71717A] text-xs mt-0.5 truncate">{job.location}</p>
        <StatusPill variant="in_progress" className="mt-2">
          In Progress
        </StatusPill>
      </div>

      <ChecklistForm
        jobId={job.id}
        orgId={job.org_id}
        items={templateItems}
      />
    </div>
  )
}
