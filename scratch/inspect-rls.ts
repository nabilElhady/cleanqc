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
  console.log('Querying policies on organizations...')
  const { data, error } = await db.rpc('get_policies_for_table', { table_name: 'organizations' })
  if (error) {
    // If get_policies_for_table RPC does not exist, query pg_policies directly
    console.log('RPC failed, querying pg_policies view directly...')
    const { data: pgData, error: pgErr } = await db.rpc('inspect_pg_policies')
    if (pgErr) {
      // Execute direct query through a helper or select
      const { data: rawData, error: rawErr } = await db.from('pg_policies' as any).select('*' as any)
      console.log('raw query results:', rawData, rawErr)
      
      // Let's run a generic query if possible or list tables
      const { data: tableData, error: tableErr } = await db.from('organizations').select('*').limit(1)
      console.log('Querying organizations table successfully:', !tableErr, tableErr)
    } else {
      console.log('pgData:', pgData)
    }
  } else {
    console.log('policies:', data)
  }

  // Let's print out what is allowed or query policies via SQL
  // Since we have service role key, we can run a SQL command if we write a function or check pg_policies
  const { data: sqlData, error: sqlErr } = await db.rpc('run_sql', { sql: 'SELECT * FROM pg_policies WHERE tablename = \'organizations\'' })
  console.log('SQL policies for organizations:', sqlData, sqlErr)
}

run().catch(console.error)
