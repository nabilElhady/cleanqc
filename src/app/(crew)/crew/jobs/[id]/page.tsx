import * as React from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ChecklistForm from './ChecklistForm'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch the job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      location,
      status,
      org_id,
      assigned_to,
      template_id,
      checklist_templates!template_id (
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // 3. Security check: Only assigned crew member can view
  if (job.assigned_to !== user.id) {
    return (
      <div className="space-y-4 text-center py-12 text-[#FAFAFA]">
        <h2 className="text-xl font-bold text-rose-450">Access Denied</h2>
        <p className="text-[#A1A1AA] text-sm">
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
      <div className="space-y-6 py-6 text-[#FAFAFA]">
        <Link href="/crew/jobs" className="inline-flex items-center text-sm text-[#A1A1AA] hover:text-[#FAFAFA] gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Jobs</span>
        </Link>

        <Card className="border-white/8 bg-[#18181B] py-12 px-4 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
              <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
            </div>
            <h3 className="font-semibold text-[#FAFAFA] text-lg">Job Completed</h3>
            <p className="text-[#A1A1AA] text-sm max-w-xs mx-auto">
              This checklist has already been submitted and the status is marked as completed.
            </p>
            <div className="pt-2">
              <Link href="/crew/jobs" passHref>
                <Button className="cursor-pointer bg-[#10B981] hover:bg-[#10B981]/90 text-white border-none">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 5. Fetch template items ordered by sort_order
  const { data: items, error: itemsError } = await supabase
    .from('template_items')
    .select('id, label, requires_photo, sort_order')
    .eq('template_id', job.template_id)
    .order('sort_order', { ascending: true })

  const templateItems = items || []

  // 6. Update job status to 'in_progress' if it is currently 'pending'
  if (job.status === 'pending') {
    await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', job.id)
  }

  return (
    <div className="space-y-6 text-[#FAFAFA]">
      <Link href="/crew/jobs" className="inline-flex items-center text-sm text-[#A1A1AA] hover:text-[#FAFAFA] gap-1 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Jobs</span>
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#FAFAFA]">{job.title}</h1>
        <p className="text-[#A1A1AA] text-xs mt-0.5 truncate">{job.location}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#8B5CF6]">
          In Progress
        </div>
      </div>

      <ChecklistForm
        jobId={job.id}
        orgId={job.org_id}
        items={templateItems}
      />
    </div>
  )
}
