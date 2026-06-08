import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { assertPremiumServer } from '@/lib/subscription'
import { InviteCrewDialog } from './InviteCrewDialog'
import { TeamListClient } from './TeamListClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await assertPremiumServer()

  // Use admin client so RLS never blocks reading org_id
  const db = createAdminClient()

  const { data: currentProfile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  if (!currentProfile?.org_id) {
    return (
      <div className="text-[#09090B] text-center p-8 bg-[#FAFAFA] border border-[#E4E4E7] max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-bold">No Organization Assigned</h3>
        <p className="text-[#71717A] text-sm mt-2">
          Your profile is not associated with any organization. Please contact your manager.
        </p>
      </div>
    )
  }

  // Fetch subscription tier to calculate limits
  let subscriptionTier = 'starter'
  const { data: orgData } = await db
    .from('organizations')
    .select('subscription_tier')
    .eq('id', currentProfile.org_id)
    .single()
  
  if (orgData?.subscription_tier) {
    subscriptionTier = orgData.subscription_tier
  }

  // Fetch all profiles in organization
  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, org_id, role, full_name, phone, created_at')
    .eq('org_id', currentProfile.org_id)
    .order('role', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !profiles) {
    return (
      <div className="text-[#09090B] text-center p-8">
        Failed to load team profiles. Please try reloading the page.
      </div>
    )
  }

  // Fetch emails from auth securely using admin client
  const emailMap: Record<string, string> = {}
  try {
    const supabaseAdmin = createAdminClient()
    const { data: authData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (!listErr && authData?.users) {
      authData.users.forEach((u) => {
        if (u.email) {
          emailMap[u.id] = u.email
        }
      })
    }
  } catch (err) {
    console.error('Failed to securely fetch crew emails:', err)
  }

  return (
    <div className="space-y-8 relative">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Management</span>
          <h1 className="text-3xl font-black tracking-tight mt-1 text-[#09090B]">Team Management</h1>
          <p className="text-[#71717A] mt-1 text-sm">
            Manage your organization's manager and cleaning crew members.
          </p>
        </div>
        <InviteCrewDialog subscriptionTier={subscriptionTier} />
      </div>

      <TeamListClient
        profiles={profiles}
        emailMap={emailMap}
        currentUserId={user.id}
        currentUserRole={currentProfile.role}
        subscriptionTier={subscriptionTier}
      />
    </div>
  )
}
