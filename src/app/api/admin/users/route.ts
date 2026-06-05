import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Verify superadmin
  const { data: callerProfile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch Auth users (for emails)
  const { data: authData, error: listError } = await db.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  // Fetch profiles
  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('id, org_id, role, full_name, created_at')

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Merge
  const users = authData.users.map((authUser) => {
    const profile = profiles.find((p) => p.id === authUser.id) || {}
    return {
      id: authUser.id,
      email: authUser.email,
      ...profile,
    }
  })

  return NextResponse.json(users)
}
