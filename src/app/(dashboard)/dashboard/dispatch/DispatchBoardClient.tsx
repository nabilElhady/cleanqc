'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLiveJobs, Job } from '@/hooks/useLiveJobs'
import { createJob } from '@/app/actions/jobs'
import { Loader2, Plus, Clock, CheckCircle2, MapPin, User, Calendar, RefreshCw } from 'lucide-react'

interface DispatchBoardClientProps {
  orgId: string
  initialJobs: Job[]
  templates: { id: string; name: string }[]
  crew: { id: string; full_name: string | null }[]
}

export function DispatchBoardClient({
  orgId,
  initialJobs,
  templates,
  crew,
}: DispatchBoardClientProps) {
  // 1. Real-time jobs list hook
  const { jobs } = useLiveJobs(orgId, initialJobs)

  // 2. Form states
  const [title, setTitle] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [assignedTo, setAssignedTo] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState('')
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  // 3. Update status handler (via Supabase client, isolated by RLS)
  const handleUpdateStatus = async (jobId: string, newStatus: 'pending' | 'active' | 'completed') => {
    const supabase = createClient()
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId)

    if (updateErr) {
      console.error('Failed to update job status:', updateErr.message)
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

      if (res.success) {
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
      {/* Editorial Header */}
      <div className="border-b border-[#E4E4E7] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] block mb-1">
            System Control
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-none uppercase">
            Live Dispatch Board
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#16A34A] bg-green-50/20 border border-green-600 px-3 py-1.5">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Realtime WebSocket Active</span>
        </div>
      </div>

      {/* Grid Dashboard - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pane 1: Dispatch Job Form (Col span 4) */}
        <div className="lg:col-span-4 border border-[#E4E4E7] bg-white p-6 rounded-none space-y-6">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] pb-3 border-b border-[#E4E4E7]">
            DISPATCH NEW JOB
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
              <label htmlFor="title" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">
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
                className="w-full rounded-none border border-[#E4E4E7] bg-white text-[#09090B] px-3 py-2 text-sm focus:outline-none focus:border-[#09090B] font-mono placeholder:text-gray-300"
              />
            </div>

            <div>
              <label htmlFor="location" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">
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
                className="w-full rounded-none border border-[#E4E4E7] bg-white text-[#09090B] px-3 py-2 text-sm focus:outline-none focus:border-[#09090B] font-mono placeholder:text-gray-300"
              />
            </div>

            <div>
              <label htmlFor="crew" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">
                ASSIGN CREW
              </label>
              <select
                id="crew"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isPending}
                className="w-full rounded-none border border-[#E4E4E7] bg-white text-[#09090B] px-3 py-2 text-sm focus:outline-none focus:border-[#09090B] font-mono cursor-pointer"
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
              <label htmlFor="template" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">
                CHECKLIST TEMPLATE
              </label>
              <select
                id="template"
                required
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-none border border-[#E4E4E7] bg-white text-[#09090B] px-3 py-2 text-sm focus:outline-none focus:border-[#09090B] font-mono cursor-pointer"
              >
                <option value="" disabled>SELECT TEMPLATE...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scheduledAt" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">
                SCHEDULED TIME
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isPending}
                className="w-full rounded-none border border-[#E4E4E7] bg-white text-[#09090B] px-3 py-2 text-sm focus:outline-none focus:border-[#09090B] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#09090B] text-white border border-[#09090B] rounded-none px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#09090B] disabled:bg-zinc-400 disabled:border-zinc-400 disabled:text-zinc-200 transition-colors duration-200 text-center cursor-pointer flex items-center justify-center gap-2"
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
        <div className="lg:col-span-4 border border-[#E4E4E7] bg-white p-6 rounded-none space-y-6">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717A] pb-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <span>PENDING DISPATCHES</span>
            <span className="bg-[#09090B] text-white px-2 py-0.5 text-[9px]">{pendingJobs.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {pendingJobs.length === 0 ? (
              <div className="border border-dashed border-[#E4E4E7] p-8 text-center font-mono text-xs text-[#71717A] uppercase">
                No Pending Dispatches
              </div>
            ) : (
              pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-[#E4E4E7] bg-white p-4 rounded-none hover:border-[#09090B] transition-colors duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                        ID: #{job.id.substring(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 border border-zinc-300 text-zinc-600 font-mono text-[9px] uppercase font-bold">
                        PENDING
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#09090B] uppercase tracking-wide mb-3">
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
                      onClick={() => handleUpdateStatus(job.id, 'active')}
                      className="flex-1 bg-[#09090B] text-white border border-[#09090B] font-mono text-[9px] font-bold uppercase tracking-widest py-1.5 hover:bg-white hover:text-[#09090B] transition-colors duration-150 cursor-pointer text-center"
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
        <div className="lg:col-span-4 border border-[#E4E4E7] bg-white p-6 rounded-none space-y-6">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] pb-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <span>ACTIVE OPERATIONS</span>
            <span className="bg-[#09090B] text-white px-2 py-0.5 text-[9px]">{activeJobs.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {activeJobs.length === 0 ? (
              <div className="border border-dashed border-[#E4E4E7] p-8 text-center font-mono text-xs text-[#71717A] uppercase">
                No Active Operations
              </div>
            ) : (
              activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-[#09090B] bg-white p-4 rounded-none flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                        ID: #{job.id.substring(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 border border-green-600 text-green-600 font-mono text-[9px] uppercase font-bold animate-pulse">
                        ACTIVE
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#09090B] uppercase tracking-wide mb-3">
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
                      className="flex-1 bg-white text-green-600 border border-green-600 font-mono text-[9px] font-bold uppercase tracking-widest py-1.5 hover:bg-green-600 hover:text-white transition-colors duration-150 cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
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
