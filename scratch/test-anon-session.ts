import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const client = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('Signing in with nabilelhady412@gmail.com...')
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'nabilelhady412@gmail.com',
    password: 'Password123!' // The password used during registration
  })

  if (authError) {
    console.error('Sign in failed:', authError.message)
    return
  }

  const user = authData.user
  console.log('Sign in successful. User ID:', user.id)

  console.log('Querying profile via anon client...')
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('Profile query result:', profile)
  console.log('Profile query error:', profileError)

  console.log('Querying organizations via anon client...')
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('*')
    .limit(1)

  console.log('Organizations query result:', org)
  console.log('Organizations query error:', orgError)
}

run().catch(console.error)
