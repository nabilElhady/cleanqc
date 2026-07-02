'use client'

import { useEffect, useState, useCallback } from 'react'
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
  templates?: { id: string; name: string } | null
  profiles?: { id: string; full_name: string | null } | null
}

export function useLiveJobs(orgId: string, initialJobs: Job[] = []) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  // Keep state in sync with initial server fetch when it changes
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  const refetchJobs = useCallback(async () => {
    if (!orgId) return

    const supabase = createClient()

    // 1. Single embedded select JOIN during hydration
    const { data: rawJobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        profiles!assigned_to(id, full_name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error || !rawJobs) return

    // Manually fetch templates to avoid foreign key failure
    const templateIds = Array.from(new Set(rawJobs.map(j => j.template_id).filter(Boolean)))
    let templatesData: any[] = []
    if (templateIds.length > 0) {
      const { data: tData } = await supabase.from('templates').select('id, name').in('id', templateIds)
      if (tData) templatesData = tData
    }

    // Hydrate the relations uniformly
    const hydratedJobs = rawJobs.map((job) => {
      const template = templatesData.find(t => t.id === job.template_id)
      
      const profileData = Array.isArray(job.profiles)
        ? job.profiles[0]
        : job.profiles

      return {
        ...job,
        templates: template ? { id: template.id, name: template.name } : null,
        profiles: profileData,
      } as Job
    })

    setJobs(hydratedJobs)
  }, [orgId])

  useEffect(() => {
    if (!orgId) return

    const supabase = createClient()

    // 3. Unified refetch on any postgres_changes event to guarantee zero-lag UI update without piecemeal query looping
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
        () => {
          refetchJobs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, refetchJobs])

  return { jobs, setJobs }
}
