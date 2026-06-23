import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/queries/getProfile'
import { redirect } from 'next/navigation'

export type UserRole = 'owner' | 'manager' | 'crew'

/**
 * Server-side route/action guard to enforce roles.
 * Verifies the user session and queries their profile role.
 * If unauthorized, it redirects or throws.
 */
export async function enforceRole(allowedRoles: UserRole[]) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const profile = await getProfile(user.id)
  if (!profile) {
    redirect('/login')
  }

  const role = (profile.role || 'crew') as UserRole

  if (!allowedRoles.includes(role)) {
    redirect('/dashboard?error=Unauthorized role access.')
  }

  return { user, profile }
}
