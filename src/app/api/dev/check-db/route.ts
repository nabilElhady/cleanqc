import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createAdminClient()

  // List auth users
  const { data: { users }, error: authErr } = await db.auth.admin.listUsers()

  const { data: profiles, error: profErr } = await db
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false } as any)
    .limit(10)

  const { data: orgs, error: orgsErr } = await db
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false } as any)
    .limit(10)

  return NextResponse.json({
    users: users?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })),
    usersError: authErr?.message,
    profiles,
    profilesError: profErr?.message,
    orgs,
    orgsError: orgsErr?.message,
  })
}
