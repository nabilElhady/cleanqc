export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params
  const body = await request.json()
  const suspend = body.suspend

  // Update profile
  const { error: updateError } = await db
    .from('profiles')
    .update({ suspended_at: suspend ? new Date().toISOString() : null })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: suspend ? 'suspended_user' : 'unsuspended_user',
    target_type: 'user',
    target_id: id,
    metadata: { suspended: suspend }
  })

  return NextResponse.json({ success: true })
}
