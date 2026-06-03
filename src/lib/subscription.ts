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
    .select('org_id, is_superadmin')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile?.is_superadmin

  if (!profile?.org_id) {
    return {
      subscriptionStatus: null,
      isPremium: isAdmin,
      isReadOnly: !isAdmin,
      isAdmin,
    }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status')
    .eq('id', profile.org_id)
    .single()

  const subscriptionStatus = org?.subscription_status || null
  const isPremium = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || isAdmin
  const isReadOnly = !isPremium

  return {
    subscriptionStatus,
    isPremium,
    isReadOnly,
    isAdmin,
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
