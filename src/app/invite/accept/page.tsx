import { getInvitationByToken } from '@/app/actions/invitations'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InviteAcceptPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const token = resolvedParams.token || ''

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b] text-[#ffffff]">
        <div className="max-w-md w-full text-center border border-[#27272a] bg-[#18181b] p-8 rounded-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Invalid Invite Link</h2>
          <p className="text-sm text-zinc-400">The secure token is missing. Please check the invitation email copy and try again.</p>
        </div>
      </div>
    )
  }

  const res = await getInvitationByToken(token)

  if (!res.success || !res.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b] text-[#ffffff]">
        <div className="max-w-md w-full text-center border border-[#27272a] bg-[#18181b] p-8 rounded-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Invitation Error</h2>
          <p className="text-sm text-zinc-400">{res.error || 'The invitation token is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  const invitation = res.invitation

  // Inline Server Action for completing onboarding
  async function completeOnboarding(formData: FormData) {
    'use server'

    const name = formData.get('name') as string
    const password = formData.get('password') as string

    if (!name || !password || password.length < 6) {
      throw new Error('Valid name and password (min 6 characters) are required.')
    }

    const adminDb = createAdminClient()

    // 1. Fetch invitation record again to ensure validity
    const { data: invRecord, error: invErr } = await adminDb
      .from('invitations')
      .select('email, role, organization_id')
      .eq('token', token)
      .single()

    if (invErr || !invRecord) {
      throw new Error('Invitation record is no longer active.')
    }

    // 2. Create the user in Auth
    const { data: authUser, error: authErr } = await adminDb.auth.admin.createUser({
      email: invRecord.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (authErr || !authUser.user) {
      throw new Error(authErr?.message || 'Failed to create user account.')
    }

    // 3. Insert operational profile record
    const { error: profileErr } = await adminDb
      .from('profiles')
      .insert({
        id: authUser.user.id,
        org_id: invRecord.organization_id, // maps organization_id to profiles.org_id
        role: invRecord.role,
        full_name: name,
      })

    if (profileErr) {
      // Clean up orphaned auth user
      await adminDb.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Profile setup failed: ${profileErr.message}`)
    }

    // 4. Delete the consumed invitation token
    await adminDb
      .from('invitations')
      .delete()
      .eq('token', token)

    // Redirect straight to dashboard
    redirect('/login?success=Onboarding completed! Please sign in to access your dashboard.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b] text-[#ffffff]">
      <div className="max-w-md w-full border border-[#27272a] bg-[#18181b] p-8 rounded-xl">
        <div className="mb-6">
          <span className="font-bold tracking-tight text-sm text-zinc-400">Crewmark</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">Join {invitation.company_name}</h2>
        <p className="text-sm text-zinc-400 mb-6">
          You are joining as a <strong className="text-white capitalize">{invitation.role}</strong>. Complete your profile details below to log in.
        </p>

        <form action={completeOnboarding} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Email Address
            </label>
            <input
              type="text"
              disabled
              value={invitation.email}
              className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Jane Doe"
              className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Create Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="••••••••"
              minLength={6}
              className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500 rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-white text-black font-bold text-sm flex justify-center items-center gap-2 hover:bg-zinc-200 transition-colors rounded-lg mt-6"
          >
            Complete Onboarding & Join
          </button>
        </form>
      </div>
    </div>
  )
}
