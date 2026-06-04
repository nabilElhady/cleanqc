import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const db = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndFix() {
  const email = 'nabilelhady73@gmail.com'
  console.log('Checking user auth...')
  const { data: { users }, error: authErr } = await db.auth.admin.listUsers()
  if (authErr) {
    console.error('Auth error:', authErr)
    return
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    console.log('User not found in Auth!')
    return
  }

  console.log('Found user in Auth:', user.id)

  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('Profile in DB:', profile, 'Error:', profErr)

  if (!profile) {
    console.log('Recreating profile...')
    const { error: insertErr } = await db
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Admin',
        role: 'superadmin',
        is_superadmin: true
      })
    console.log('Insert result:', insertErr)
  } else {
    console.log('Updating profile to superadmin...')
    const { error: updateErr } = await db
      .from('profiles')
      .update({
        is_superadmin: true,
        role: 'superadmin'
      })
      .eq('id', user.id)
    console.log('Update result:', updateErr)
  }
}

checkAndFix()
