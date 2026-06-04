import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function run() {
  console.log('--- Auth Users ---')
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    console.error('List auth users error:', listErr)
    return
  }

  // Sort by created_at descending and get top 5
  const sortedUsers = users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  console.log(sortedUsers.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })))

  console.log('--- Profiles ---')
  const { data: profiles, error: profErr } = await db.from('profiles').select('*').limit(5)
  console.log('Profiles:', profiles, 'Error:', profErr)

  console.log('--- Organizations ---')
  const { data: orgs, error: orgsErr } = await db.from('organizations').select('*').limit(5)
  console.log('Organizations:', orgs, 'Error:', orgsErr)
}

run().catch(console.error)
