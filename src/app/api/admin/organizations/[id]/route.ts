import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { name, subscription_status } = body

  const updatePayload: any = {}
  if (name !== undefined) updatePayload.name = name
  if (subscription_status !== undefined) updatePayload.subscription_status = subscription_status

  const { error: updateError } = await db
    .from('organizations')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'updated_organization',
    target_type: 'org',
    target_id: id,
    metadata: updatePayload
  })

  return NextResponse.json({ success: true })
}

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

  // First fetch all members to delete their auth accounts
  const { data: members } = await db
    .from('profiles')
    .select('id')
    .eq('org_id', id)

  if (members && members.length > 0) {
    for (const member of members) {
      if (member.id !== user.id) { // Don't delete the caller if they happen to be in the org
        await db.auth.admin.deleteUser(member.id)
      }
    }
  }

  // Delete org (cascades to remaining profile rows, jobs, etc. based on foreign keys)
  const { error: deleteError } = await db
    .from('organizations')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'deleted_organization',
    target_type: 'org',
    target_id: id,
  })

  return NextResponse.json({ success: true })
}
