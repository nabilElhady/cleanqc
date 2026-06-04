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
  const email = 'nabilelhady691@gmail.com'
  console.log(`Checking for user: ${email}`)
  
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    console.error('List error:', listErr)
    return
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    console.log(`User ${email} does not exist in Auth.`)
    return
  }

  console.log(`Found user ${email} with ID ${user.id}. Deleting...`)
  
  const { error: delErr } = await db.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error('Delete error:', delErr)
  } else {
    console.log('User deleted successfully from Auth!')
  }

  // Also clean up profile if it got created
  const { error: profileDelErr } = await db.from('profiles').delete().eq('id', user.id)
  if (profileDelErr) {
    console.error('Profile cleanup error:', profileDelErr)
  } else {
    console.log('Profile cleaned up successfully!')
  }
}

run().catch(console.error)
