import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function run() {
  console.log('Querying pg_policies...')
  const { data, error } = await db.rpc('run_sql', {
    sql: `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check 
      FROM pg_policies 
      WHERE tablename IN ('profiles', 'organizations')
    `
  })

  const result = {
    data,
    error: error?.message
  }

  console.log('Result:', result)

  fs.writeFileSync(
    path.resolve(process.cwd(), 'scratch/profiles-policies.json'),
    JSON.stringify(result, null, 2),
    'utf-8'
  )
  console.log('Wrote results to scratch/profiles-policies.json')
}

run().catch(console.error)
