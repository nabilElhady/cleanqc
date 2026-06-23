import * as React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamDashboardPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile using admin client to bypass RLS blocks
  const db = createAdminClient()
  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile?.org_id) {
    redirect('/login')
  }

  // Owner verification
  if (profile.role !== 'owner') {
    return (
      <div className="text-[#09090B] text-center p-8 bg-[#FAFAFA] border border-black max-w-lg mx-auto mt-12 border-t-2 border-l-2 border-b-4 border-r-4">
        <h3 className="text-lg font-black font-mono uppercase">ACCESS DENIED</h3>
        <p className="text-zinc-500 font-mono text-xs mt-2 uppercase tracking-wide">
          Only organization owners have access to this page.
        </p>
      </div>
    )
  }

  // 3. Fetch all team profiles in organization
  const { data: teamProfiles, error: teamErr } = await db
    .from('profiles')
    .select('id, full_name, role, crew_passcode')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  if (teamErr || !teamProfiles) {
    return (
      <div className="text-[#09090B] text-center p-8 font-mono text-xs uppercase">
        Failed to load team profiles. Please refresh the page.
      </div>
    )
  }

  // 4. Fetch auth metadata securely using admin client to resolve emails & activity status
  const emailMap: Record<string, string> = {}
  const statusMap: Record<string, 'ACTIVE' | 'PENDING'> = {}

  try {
    const { data: authData, error: listErr } = await db.auth.admin.listUsers({
      perPage: 1000,
    })

    if (!listErr && authData?.users) {
      authData.users.forEach((u) => {
        if (u.email) {
          emailMap[u.id] = u.email
        }
        statusMap[u.id] = u.last_sign_in_at ? 'ACTIVE' : 'PENDING'
      })
    }
  } catch (err) {
    console.error('Failed to securely fetch team emails and status:', err)
  }

  // 5. Map DB profiles and Auth metadata together
  const initialCrew = teamProfiles.map((member) => ({
    id: member.id,
    fullName: member.full_name || (member.role === 'owner' ? 'Org Owner' : 'Invited Member'),
    email: member.crew_passcode ? `CODE: ${member.crew_passcode}` : (emailMap[member.id] || 'N/A'),
    status: member.crew_passcode ? 'ACTIVE' : (statusMap[member.id] || 'PENDING'),
    role: member.role,
  }))

  return (
    <div className="space-y-8 relative text-[#09090B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500">
            Organization
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-1 uppercase font-mono text-black">
            My Team
          </h1>
          <p className="text-zinc-500 mt-1 font-mono text-xs uppercase tracking-wide">
            Add cleaners so you can assign jobs to them.
          </p>
        </div>
      </div>

      <TeamClient initialCrew={initialCrew} companyId={profile.org_id} />
    </div>
  )
}
