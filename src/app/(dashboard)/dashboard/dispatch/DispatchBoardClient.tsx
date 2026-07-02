'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLiveJobs, Job } from '@/hooks/useLiveJobs'
import { createJob, updateJobStatus } from '@/app/actions/jobs'
import { Loader2, Plus, Clock, CheckCircle2, MapPin, User, Calendar, RefreshCw } from 'lucide-react'

interface DispatchBoardClientProps {
  orgId: string
  initialJobs: Job[]
  templates: { 
    id: string; 
    name: string; 
    is_system?: boolean;
    items?: any; // System template items
    template_items?: { template_id: string; label: string; requires_photo: boolean }[]; // Custom template items
  }[]
  crew: { id: string; full_name: string | null }[]
  initialTemplateId?: string
}

export function DispatchBoardClient({
  orgId,
  initialJobs,
  templates,
  crew,
  initialTemplateId = '',
}: DispatchBoardClientProps) {
  // 1. Real-time jobs list hook
  const { jobs, setJobs } = useLiveJobs(orgId, initialJobs)

  // 2. Form states
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(initialTemplateId)
  
  // Set initial title if template provided
  const initialSelectedTemplate = templates.find(t => t.id === initialTemplateId)
  const [title, setTitle] = React.useState(
    initialSelectedTemplate ? `${initialSelectedTemplate.name} - ${new Date().toLocaleDateString()}` : ''
  )
  const [location, setLocation] = React.useState('')
  const [assignedTo, setAssignedTo] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  // Auto-fill title when template changes manually
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    setSelectedTemplateId(newId)
    const matched = templates.find(t => t.id === newId)
    if (matched && !title) {
      setTitle(`${matched.name.toUpperCase()} - ${new Date().toLocaleDateString()}`)
    } else if (matched && title) {
      // If they had an auto-filled title from a previous template, replace it
      const prevMatched = templates.find(t => title.startsWith(t.name.toUpperCase()))
      if (prevMatched) {
        setTitle(`${matched.name.toUpperCase()} - ${new Date().toLocaleDateString()}`)
      }
    }
  }

  // Derive active template to render preview
  const activeTemplate = templates.find(t => t.id === selectedTemplateId)
  let previewItems: { label: string; section?: string; requires_photo?: boolean }[] = []
  
  if (activeTemplate) {
    if (activeTemplate.is_system && activeTemplate.items) {
      // Parse system JSON array
      try {
        const parsed = typeof activeTemplate.items === 'string' ? JSON.parse(activeTemplate.items) : activeTemplate.items;
        if (Array.isArray(parsed)) {
          // Flatten sections
          parsed.forEach((section: any) => {
            if (section.tasks && Array.isArray(section.tasks)) {
              section.tasks.forEach((task: any) => {
                previewItems.push({ label: task.label, section: section.section, requires_photo: task.requiresPhoto })
              })
            }
          })
        }
      } catch (e) {
        console.error("Failed to parse system template items", e)
      }
    } else if (!activeTemplate.is_system && activeTemplate.template_items) {
      previewItems = activeTemplate.template_items.map(i => ({ label: i.label, requires_photo: i.requires_photo }))
    }
  }
  // 3. Update status handler (via server action to bypass RLS recursion)
  const handleUpdateStatus = async (jobId: string, newStatus: 'pending' | 'active' | 'in_progress' | 'completed') => {
    // Optimistic UI update
    setJobs(currentJobs => 
      currentJobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus as any } : job
      )
    )

    const res = await updateJobStatus(jobId, newStatus)
    
    if (!res.success) {
      console.error('Failed to update job status:', res.error)
      // Revert on error
      setJobs(currentJobs => 
        currentJobs.map(job => 
          job.id === jobId ? { ...job, status: 'pending' } : job
        )
      )
    }
  }

  // 4. Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignedTo || !scheduledAt || !selectedTemplateId) {
      setError('Please fill in all fields.')
      return
    }

    setIsPending(true)
    setError(null)
    setSuccess(false)

    try {
      const isoDate = new Date(scheduledAt).toISOString()
      const res = await createJob(
        title,
        location,
        assignedTo,
        isoDate,
        selectedTemplateId
      )

      if (res.success && res.data) {
        // Optimistically update the UI so it instantly pops up without waiting for Realtime or page refresh
        const matchedTemplate = templates.find(t => t.id === selectedTemplateId)
        const matchedCrew = crew.find(c => c.id === assignedTo)
        
        const newJob: Job = {
          id: res.data.id,
          org_id: orgId,
          title,
          location,
          status: 'pending',
          assigned_to: assignedTo,
          created_at: new Date().toISOString(),
          scheduled_at: isoDate,
          template_id: selectedTemplateId,
          templates: matchedTemplate ? { id: matchedTemplate.id, name: matchedTemplate.name } : null,
          profiles: matchedCrew ? { id: matchedCrew.id, full_name: matchedCrew.full_name } : null
        }
        
        setJobs([newJob, ...jobs])

        setTitle('')
        setLocation('')
        setAssignedTo('')
        setScheduledAt('')
        setSelectedTemplateId('')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(res.error || 'Failed to dispatch job.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.')
    } finally {
      setIsPending(false)
    }
  }

  // Grouping jobs dynamically based on status
  const pendingJobs = jobs.filter((j) => j.status === 'pending')
  const activeJobs = jobs.filter((j) => j.status === 'active' || j.status === 'in_progress')

  return (
    <div className="space-y-8 text-[#09090B]">
      {/* Plain-English Header */}
      <div className="border-b border-[#E4E4E7] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] block mb-1">
            Operations
          </span>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[#09090B]">
            Send a Job
          </h1>
          <p className="text-[#71717A] text-sm mt-2">
            Fill in the form, assign a crew member, and the job appears live on the right.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#16A34A] bg-green-50/20 border border-green-600 px-3 py-1.5">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Live Updates</span>
        </div>
      </div>

      {/* Grid Dashboard - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pane 1: Dispatch Job Form (Col span 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-md p-6 transition-all space-y-6 relative z-10">
          <h2 className="text-lg font-bold text-[#09090B] pb-3 border-b border-[#E4E4E7]">
            Job Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-xs text-red-600 border border-red-600 p-3 font-mono uppercase bg-red-50/10">
                ERROR: {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-green-600 border border-green-600 p-3 font-mono uppercase bg-green-50/10">
                SUCCESS: JOB DISPATCHED SUCCESSFULLY
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-xs font-extrabold tracking-widest text-zinc-600 mb-1.5 uppercase">
                JOB TITLE
              </label>
              <input
                id="title"
                type="text"
                required
                placeholder="E.G. UNIT 102 POST-CHECKOUT"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                className="w-full bg-white text-zinc-900 font-semibold border-2 border-zinc-300 rounded-xl px-6 py-3 text-sm placeholder:text-zinc-600 focus:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/50 transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-extrabold tracking-widest text-zinc-600 mb-1.5 uppercase">
                LOCATION
              </label>
              <input
                id="location"
                type="text"
                required
                placeholder="E.G. 742 EVERGREEN TERRACE"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isPending}
                className="w-full bg-white text-zinc-900 font-bold border-2 border-zinc-300 rounded-xl px-6 py-3 text-sm placeholder:text-zinc-600 focus:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/50 transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="crew" className="block text-sm font-black tracking-widest text-zinc-700 mb-1.5 uppercase">
                ASSIGN CREW
              </label>
              <select
                id="crew"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isPending}
                className="w-full bg-white text-zinc-900 font-semibold border-2 border-zinc-300 rounded-xl px-6 py-3 text-sm placeholder:text-zinc-400 focus:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/50 transition-all outline-none cursor-pointer"
              >
                <option value="" disabled>SELECT CREW MEMBER...</option>
                {crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name?.toUpperCase() || 'UNNAMED CREW'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="template" className="block text-xs font-extrabold tracking-widest text-zinc-600 mb-1.5 uppercase">
                CHECKLIST TEMPLATE
              </label>
              <select
                id="template"
                required
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                disabled={isPending}
                className="w-full bg-white text-zinc-900 font-semibold border-2 border-zinc-300 rounded-xl px-6 py-3 text-sm placeholder:text-zinc-400 focus:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/50 transition-all outline-none cursor-pointer"
              >
                <option value="" disabled>SELECT TEMPLATE...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Checklist Preview */}
              {previewItems.length > 0 && (
                <div className="mt-4 p-4 border border-[#E4E4E7] bg-zinc-50/50">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-3">
                    Template Tasks ({previewItems.length})
                  </p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {previewItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-mono text-[#09090B]">
                        <span className="text-[#16A34A] mt-0.5">✓</span>
                        <div className="flex-1">
                          <span className="uppercase">{item.label}</span>
                          {item.requires_photo && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 border border-[#E4E4E7] text-[8px] text-[#71717A] bg-white">
                              📷 PHOTO
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="scheduled" className="block text-xs font-extrabold tracking-widest text-zinc-600 mb-1.5 uppercase">
                SCHEDULED TIME
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isPending}
                className="w-full bg-white text-zinc-900 font-semibold border-2 border-zinc-300 rounded-xl px-6 py-3 text-sm placeholder:text-zinc-600 focus:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/50 transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#09090B] text-white font-bold text-xs tracking-widest uppercase px-6 py-3 rounded-full hover:bg-[#27272A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:-translate-y-0 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>DISPATCHING...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>DISPATCH JOB</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pane 2: Pending Dispatches (Col span 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-md p-6 transition-all space-y-6 relative z-10">
          <h2 className="text-lg font-bold text-[#09090B] pb-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <span>Waiting to Start</span>
            <span className="bg-[#09090B] text-white px-2 py-0.5 text-[9px]">{pendingJobs.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {pendingJobs.length === 0 ? (
              <div className="min-h-[160px] flex flex-col items-center justify-center border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA] p-6 text-center">
                <div className="h-11 w-11 flex items-center justify-center border bg-slate-500/10 text-slate-600 border-slate-500/30 mb-3">
                  <Clock strokeWidth={1.5} className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-[#71717A]">No Pending Dispatches</p>
              </div>
            ) : (
              pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="border-2 border-zinc-300 bg-white p-4 rounded-xl shadow-sm hover:border-zinc-400 transition-colors duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                        ID: #{job.id.substring(0, 8)}
                      </span>
                      <span className="px-2.5 py-0.5 border border-zinc-300 text-zinc-600 font-mono text-[10px] uppercase font-bold rounded-full">
                        <span>PENDING</span>
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#09090B] uppercase tracking-wide mb-3">
                      {job.title}
                    </h3>
                    <div className="font-mono text-[10px] text-[#71717A] uppercase space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>{job.profiles?.full_name || 'UNASSIGNED'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>
                          {new Date(job.scheduled_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#E4E4E7] pt-3 mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                      className="flex-1 rounded-lg bg-[#09090B] text-white font-medium text-[10px] uppercase tracking-wider py-2 hover:bg-[#27272A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 cursor-pointer text-center"
                    >
                      START OPERATIONS
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pane 3: Active Operations (Col span 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-md p-6 transition-all space-y-6 relative z-10">
          <h2 className="text-lg font-bold text-[#09090B] pb-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <span>In Progress</span>
            <span className="bg-[#09090B] text-white px-2 py-0.5 text-[9px]">{activeJobs.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {activeJobs.length === 0 ? (
              <div className="min-h-[160px] flex flex-col items-center justify-center border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA] p-6 text-center">
                <div className="h-11 w-11 flex items-center justify-center border bg-slate-500/10 text-slate-600 border-slate-500/30 mb-3">
                  <CheckCircle2 strokeWidth={1.5} className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-[#71717A]">No Active Operations</p>
              </div>
            ) : (
              activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="border-2 border-neutral-900 bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                        ID: #{job.id.substring(0, 8)}
                      </span>
                      <span className="px-2.5 py-0.5 border border-green-600 text-green-600 font-mono text-[10px] uppercase font-bold animate-pulse rounded-full">
                        ACTIVE
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#09090B] uppercase tracking-wide mb-3">
                      {job.title}
                    </h3>
                    <div className="font-mono text-[10px] text-[#71717A] uppercase space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>{job.profiles?.full_name || 'UNASSIGNED'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>
                          {new Date(job.scheduled_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#E4E4E7] pt-3 mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'completed')}
                      className="flex-1 rounded-lg bg-white text-green-600 border border-green-600 font-medium text-[10px] uppercase tracking-wider py-2 hover:bg-green-50 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 strokeWidth={2.5} className="h-3 w-3" />
                      <span>COMPLETE OPERATION</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
