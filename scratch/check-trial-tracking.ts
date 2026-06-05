import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const db = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('Querying trial_tracking table...')
  const { data, error } = await db
    .from('trial_tracking')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error querying trial_tracking:', error)
  } else {
    console.log('trial_tracking exists, data:', data)
  }
}

run()
