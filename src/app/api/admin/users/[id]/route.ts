import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Prevent self-deletion
  if (user.id === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  // Delete from Auth (this cascades to profiles and other tables due to foreign key constraints if set up)
  const { error: deleteError } = await db.auth.admin.deleteUser(id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'deleted_user',
    target_type: 'user',
    target_id: id,
  })

  return NextResponse.json({ success: true })
}
