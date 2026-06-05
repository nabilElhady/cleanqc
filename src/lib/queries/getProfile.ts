import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export const getProfile = cache(async (userId: string) => {
  const db = createAdminClient()
  const { data, error } = await db
    .from('profiles')
    .select('id, org_id, role, full_name')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
})
