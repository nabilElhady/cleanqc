import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Parse .env.local manually
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=')
  if (k) env[k] = v.join('=').replace(/\r$/, '')
})

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars. Check .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

async function run() {
  console.log('\n=== 1. Recent Auth Users (last 5) ===')
  const { data: { users }, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 })
  if (uErr) { console.error('ERROR listing users:', uErr.message); }
  else {
    users.forEach(u => {
      console.log(`  ${u.email}  | confirmed: ${!!u.email_confirmed_at}  | id: ${u.id}`)
    })
  }

  console.log('\n=== 2. Recent Profiles (last 5) ===')
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name, org_id, role')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(5)

  if (pErr) { console.error('ERROR reading profiles:', pErr.message) }
  else {
    profiles.forEach(p => {
      console.log(`  ${p.full_name || '(no name)'}  | role: ${p.role}  | org_id: ${p.org_id || 'NULL ⚠️'}  | id: ${p.id}`)
    })
  }

  console.log('\n=== 3. RLS Policies on profiles table ===')
  const { data: rlsData, error: rlsErr } = await admin.rpc('exec_sql', {
    query: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles' ORDER BY cmd, policyname`
  })
  if (rlsErr) {
    // Try alternative approach - list via information schema
    const { data: rlsData2, error: rlsErr2 } = await admin
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'profiles')
    if (rlsErr2) {
      console.log('  (cannot query pg_policies directly - normal)')
      console.log('  Trying SQL via rpc run_sql...')
    } else {
      console.log('  policies:', rlsData2)
    }
  } else {
    console.log('  policies:', rlsData)
  }

  console.log('\n=== 4. Check if email confirmation is required ===')
  console.log('  If a user email is NOT confirmed, supabase.auth.getUser() works,')
  console.log('  but their profile might exist. Check the "confirmed" column above.')
  console.log('  If you see confirmed: false, go to Supabase Dashboard > Auth > Email Templates')
  console.log('  and DISABLE "Confirm email" under Auth > Providers > Email.')

  console.log('\n=== 5. Organizations table (last 5) ===')
  const { data: orgs, error: orgErr } = await admin
    .from('organizations')
    .select('id, name, slug')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(5)
  if (orgErr) { console.error('ERROR reading organizations:', orgErr.message) }
  else {
    orgs.forEach(o => {
      console.log(`  "${o.name}" | slug: ${o.slug} | id: ${o.id}`)
    })
  }
}

run().catch(console.error)
