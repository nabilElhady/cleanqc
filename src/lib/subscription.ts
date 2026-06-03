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
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return {
      subscriptionStatus: null,
      isPremium: false,
      isReadOnly: true,
    }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status')
    .eq('id', profile.org_id)
    .single()

  const subscriptionStatus = org?.subscription_status || null
  const isPremium = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
  const isReadOnly = !isPremium

  return {
    subscriptionStatus,
    isPremium,
    isReadOnly,
  }
}

/**
 * Asserts that the current user belongs to an active premium organization.
 * Throws a strict 403 error if the check fails.
 */
export async function assertPremiumServer() {
  const { isPremium } = await getSubscriptionServer()
  if (!isPremium) {
    throw new Error('403: Active subscription required')
  }
}
