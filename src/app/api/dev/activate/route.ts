import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.org_id) {
      return NextResponse.json({ error: 'User profile or associated organization not found' }, { status: 404 })
    }

    // Update using admin client
    const adminSupabase = createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('organizations')
      .update({
        subscription_status: 'active',
      })
      .eq('id', profile.org_id)

    if (updateError) {
      console.error('Dev activation error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`Successfully activated subscription for organization ${profile.org_id} via dev endpoint`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Dev activation route error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
