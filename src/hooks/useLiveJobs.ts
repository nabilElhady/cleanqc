'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Job {
  id: string
  org_id: string
  title: string
  location: string
  status: 'pending' | 'active' | 'in_progress' | 'completed'
  assigned_to: string | null
  created_at: string
  scheduled_at: string
  template_id?: string
  checklist_templates?: { id: string; name: string } | null
  profiles?: { id: string; full_name: string | null } | null
}

export function useLiveJobs(orgId: string, initialJobs: Job[] = []) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  // Keep state in sync with initial server fetch when it changes
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    if (!orgId) return

    const supabase = createClient()

    // Subscribe to changes on the jobs table filtered by organization id
    const channel = supabase
      .channel(`live-jobs-org-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRawJob = payload.new as Job

            // Fetch relations for the newly created job
            const { data: joinedJob } = await supabase
              .from('jobs')
              .select(`
                *,
                checklist_templates!template_id (id, name),
                profiles!assigned_to (id, full_name)
              `)
              .eq('id', newRawJob.id)
              .single()

            const jobToInsert = joinedJob || newRawJob

            setJobs((prev) => {
              if (prev.some((j) => j.id === jobToInsert.id)) return prev
              return [jobToInsert, ...prev]
            })

          } else if (payload.eventType === 'UPDATE') {
            const updatedRawJob = payload.new as Job

            // Fetch relations for updated job
            const { data: joinedJob } = await supabase
              .from('jobs')
              .select(`
                *,
                checklist_templates!template_id (id, name),
                profiles!assigned_to (id, full_name)
              `)
              .eq('id', updatedRawJob.id)
              .single()

            const jobToUpdate = joinedJob || updatedRawJob

            setJobs((prev) =>
              prev.map((j) => (j.id === jobToUpdate.id ? jobToUpdate : j))
            )

          } else if (payload.eventType === 'DELETE') {
            const deletedJob = payload.old as { id: string }
            setJobs((prev) => prev.filter((j) => j.id !== deletedJob.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])

  return { jobs, setJobs }
}
