export const dynamic = 'force-dynamic';
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
  const { status } = body

  const { error: updateError } = await db
    .from('jobs')
    .update({ status })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'updated_job_status',
    target_type: 'job',
    target_id: id,
    metadata: { status }
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

  // Delete job
  const { error: deleteError } = await db
    .from('jobs')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'deleted_job',
    target_type: 'job',
    target_id: id,
  })

  return NextResponse.json({ success: true })
}
