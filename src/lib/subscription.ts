import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function getSubscriptionServer() {
  // Use cookie-based client ONLY for auth identity check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      subscriptionStatus: null,
      isPremium: false,
      isReadOnly: true,
      isAdmin: false,
      isOwner: false,
    }
  }

  // Use admin client for DB reads — bypasses RLS so org_id is never null
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role, is_superadmin, organizations(subscription_status)')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile?.is_superadmin
  const isOwner = profile?.role === 'owner'
  const isPermitted = isAdmin

  if (!profile?.org_id) {
    return {
      subscriptionStatus: null,
      isPremium: isPermitted,
      isReadOnly: !isPermitted,
      isAdmin,
      isOwner,
    }
  }

  const org = profile.organizations as any
  const subscriptionStatus = org?.subscription_status || null
  const isPremium = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || isPermitted
  const isReadOnly = !isPremium

  return {
    subscriptionStatus,
    isPremium,
    isReadOnly,
    isAdmin,
    isOwner,
  }
}

/**
 * Asserts that the current user belongs to an active premium organization or is an admin.
 * Throws a strict 403 error if the check fails.
 */
export async function assertPremiumServer() {
  const { isPremium } = await getSubscriptionServer()
  if (!isPremium) {
    throw new Error('403: Active subscription required')
  }
}
