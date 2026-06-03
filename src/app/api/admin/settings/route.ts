import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = createAdminClient()

  // Fetch settings
  const { data: settings, error } = await db
    .from('system_settings')
    .select('*')

  if (error || !settings) {
    return NextResponse.json({ maintenance_mode: false })
  }

  const maintenanceMode = settings.find((s) => s.id === 'maintenance_mode')
  
  return NextResponse.json({
    maintenance_mode: maintenanceMode ? maintenanceMode.value : false
  })
}

export async function POST(request: Request) {
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

  const body = await request.json()
  const { maintenance_mode } = body

  // Upsert settings
  const { error: updateError } = await db
    .from('system_settings')
    .upsert({ id: 'maintenance_mode', value: maintenance_mode })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await db.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'updated_system_settings',
    target_type: 'system',
    target_id: 'maintenance_mode',
    metadata: { maintenance_mode }
  })

  return NextResponse.json({ success: true })
}
