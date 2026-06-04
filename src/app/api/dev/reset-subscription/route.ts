import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const updates: Record<string, any> = {}

    // Use admin client to query the profile to bypass any RLS rules
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    let orgId = profile?.org_id

    // If no org_id exists, find the first organization or create one
    if (!orgId) {
      const { data: orgs } = await adminSupabase
        .from('organizations')
        .select('id')
        .limit(1)

      if (orgs && orgs.length > 0) {
        orgId = orgs[0].id
      } else {
        // Create a default test organization
        const { data: newOrg, error: createOrgErr } = await adminSupabase
          .from('organizations')
          .insert({ name: 'Test Org', subscription_status: null })
          .select('id')
          .single()

        if (createOrgErr || !newOrg) {
          return NextResponse.json({ error: `Failed to create a default organization: ${createOrgErr?.message}` }, { status: 500 })
        }
        orgId = newOrg.id
      }
    }

    // Reset organization subscription to null
    if (orgId) {
      const { error: orgError } = await adminSupabase
        .from('organizations')
        .update({ subscription_status: null })
        .eq('id', orgId)

      if (orgError) {
        return NextResponse.json({ error: `Failed to reset organization subscription: ${orgError.message}` }, { status: 500 })
      }
      updates.organization_reset = orgId
    }

    // Reset profile and link to the valid orgId
    const { error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update({
        is_superadmin: false,
        role: 'owner',
        org_id: orgId
      })
      .eq('id', user.id)

    if (profileUpdateError) {
      return NextResponse.json({ error: `Failed to update profile: ${profileUpdateError.message}` }, { status: 500 })
    }
    updates.profile_reset = user.id
    updates.assigned_org_id = orgId

    return NextResponse.json({
      success: true,
      message: 'Subscription, super-admin, and organization connection have been successfully reset. Your account is now a standard owner linked to a valid organization with no active subscription.',
      details: updates
    })
  } catch (err: any) {
    console.error('Reset subscription endpoint error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
