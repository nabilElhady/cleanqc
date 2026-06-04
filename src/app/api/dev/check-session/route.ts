import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  // Get user from cookies
  const { data: { user }, error: userErr } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ loggedIn: false, error: userErr?.message })
  }

  // Now query profile using this cookie client
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    loggedIn: true,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    profileError: profileError ? { message: profileError.message, code: profileError.code } : null,
  })
}
