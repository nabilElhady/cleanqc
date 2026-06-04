import * as React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChecklistForm from './ChecklistForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CrewJobExecutionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch User Profile to verify role and organization context via admin client to bypass RLS recursion
  const db = createAdminClient()
  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return (
      <div className="min-h-screen bg-white text-black p-6 font-mono flex flex-col justify-between border-4 border-black">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">Error: Profile resolution</h1>
          <p className="mt-4 text-sm uppercase">Failed to retrieve user profile credentials.</p>
        </div>
        <Link href="/login" className="block text-center border-2 border-black bg-black text-white py-3 uppercase font-bold tracking-widest text-xs">
          Back to Login
        </Link>
      </div>
    )
  }

  // Verify 'crew' role
  if (profile.role !== 'crew') {
    return (
      <div className="min-h-screen bg-white text-black p-6 font-mono flex flex-col justify-between border-4 border-black">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">Access Denied</h1>
          <p className="mt-4 text-sm uppercase">Only crew members are authorized to access the execution interface.</p>
        </div>
        <Link href="/dashboard" className="block text-center border-2 border-black bg-black text-white py-3 uppercase font-bold tracking-widest text-xs">
          Dashboard
        </Link>
      </div>
    )
  }

  // 3. Fetch specific job details
  const { data: job, error: jobErr } = await supabase
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
        name,
        description
      )
    `)
    .eq('id', id)
    .single()

  if (jobErr || !job) {
    notFound()
  }

  // 4. Verify organization isolation and task assignment
  if (job.org_id !== profile.org_id || job.assigned_to !== user.id) {
    return (
      <div className="min-h-screen bg-white text-black p-6 font-mono flex flex-col justify-between border-4 border-black">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">Access Denied</h1>
          <p className="mt-4 text-sm uppercase">You are not authorized to view or edit this checklist.</p>
        </div>
        <Link href="/crew/jobs" className="block text-center border-2 border-black bg-black text-white py-3 uppercase font-bold tracking-widest text-xs">
          View Assigned Jobs
        </Link>
      </div>
    )
  }

  // 5. Job already completed check
  if (job.status === 'completed') {
    return (
      <div className="min-h-screen bg-white text-black p-6 font-mono flex flex-col justify-between border-4 border-black">
        <div className="space-y-6">
          <div className="border-b-2 border-black pb-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inspection Archived</span>
            <h1 className="text-2xl font-black uppercase tracking-tight mt-1">{job.title}</h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase">{job.location}</p>
          </div>
          <div className="border border-black p-6 bg-zinc-50">
            <h2 className="font-black text-lg uppercase tracking-tight">Job Completed</h2>
            <p className="text-xs mt-2 text-zinc-600 leading-relaxed uppercase">
              This checklist has already been submitted and the status is marked as completed in the system.
            </p>
          </div>
        </div>
        <Link href="/crew/jobs" className="block text-center border-2 border-black bg-black text-white py-3 uppercase font-bold tracking-widest text-xs">
          View Assigned Jobs
        </Link>
      </div>
    )
  }

  // 6. Fetch template items ordered by sort_order
  const { data: rawItems, error: itemsErr } = await supabase
    .from('template_items')
    .select('id, label, requires_photo, sort_order')
    .eq('template_id', job.template_id)
    .order('sort_order', { ascending: true })

  const items = rawItems || []

  // Group items into Sections dynamically based on label prefix
  const sectionsMap: Record<string, typeof items> = {}
  items.forEach((item) => {
    let sectionName = 'GENERAL'
    let labelText = item.label

    if (item.label.includes(':')) {
      const parts = item.label.split(':')
      sectionName = parts[0].trim().toUpperCase()
      labelText = parts.slice(1).join(':').trim()
    }

    if (!sectionsMap[sectionName]) {
      sectionsMap[sectionName] = []
    }
    sectionsMap[sectionName].push({
      ...item,
      label: labelText,
    })
  })

  const groupedSections = Object.keys(sectionsMap).map((name) => ({
    name,
    items: sectionsMap[name],
  }))

  // 7. Update status to 'in_progress' if currently 'pending'
  if (job.status === 'pending') {
    await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', job.id)
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col justify-between border-4 border-black relative">
      <div className="p-6 space-y-6 pb-36">
        {/* Stark Back link */}
        <Link href="/crew/jobs" className="inline-flex items-center text-xs font-bold uppercase tracking-widest border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors duration-150">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Back to Jobs</span>
        </Link>

        {/* Job Header */}
        <div className="border-b-2 border-black pb-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Active Inspection</span>
          <h1 className="text-2xl font-black uppercase tracking-tight">{job.title}</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase">{job.location}</p>
        </div>

        {/* Render Form */}
        <ChecklistForm
          jobId={job.id}
          orgId={job.org_id}
          sections={groupedSections}
        />
      </div>
    </div>
  )
}
