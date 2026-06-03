import { createClient } from '@/lib/supabase/server'

export async function getSubscriptionServer() {
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
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, is_superadmin')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile?.is_superadmin
  const isOwner = profile?.role === 'owner'
  const isPermitted = isAdmin || isOwner

  if (!profile?.org_id) {
    return {
      subscriptionStatus: null,
      isPremium: isPermitted,
      isReadOnly: !isPermitted,
      isAdmin,
      isOwner,
    }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status')
    .eq('id', profile.org_id)
    .single()

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
