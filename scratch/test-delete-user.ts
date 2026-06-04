import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const db = createClient(supabaseUrl, supabaseServiceKey)

async function testDeleteUser() {
  const userId = 'a1a577dd-3c62-46b9-b32d-b45e51c2ea59'
  console.log('Testing delete user:', userId)
  const { error } = await db.auth.admin.deleteUser(userId)
  console.log('Delete error:', error)
}

testDeleteUser()
