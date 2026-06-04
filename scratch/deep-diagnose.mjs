// deep-diagnose.mjs
// Diagnoses the "No Organization Assigned" bug by querying Supabase directly.
// Run: node scratch/deep-diagnose.mjs (from cleanqc root)

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Parse .env.local
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim().replace(/\r$/, '')
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) return
  const k = trimmed.slice(0, eqIdx).trim()
  const v = trimmed.slice(eqIdx + 1).trim()
  env[k] = v
})

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Helper: run raw SQL via Supabase's postgres REST endpoint
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) return { error: await res.text(), data: null }
  const data = await res.json()
  return { data, error: null }
}

async function run() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║         CleanQC Sign-up Deep Diagnosis           ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  // ── 1. RECENT AUTH USERS ───────────────────────────────────────────────────
  console.log('── 1. RECENT AUTH USERS (last 8) ──────────────────')
  const { data: { users }, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 8 })
  if (uErr) {
    console.error('   ❌ Error:', uErr.message)
  } else {
    users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach(u => {
        const confirmed = u.email_confirmed_at ? '✅ confirmed' : '⚠️  NOT confirmed'
        console.log(`   ${u.email?.padEnd(35)} | ${confirmed} | id: ${u.id}`)
      })
  }

  // ── 2. PROFILES TABLE ──────────────────────────────────────────────────────
  console.log('\n── 2. PROFILES TABLE (all rows) ────────────────────')
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name, org_id, role, is_superadmin, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (pErr) {
    console.error('   ❌ Error reading profiles:', pErr.message)
    console.error('   👉 This table might not exist or has a different name.')
  } else if (!profiles || profiles.length === 0) {
    console.log('   ⚠️  NO ROWS in profiles table - trigger is NOT creating profiles!')
  } else {
    profiles.forEach(p => {
      const orgStatus = p.org_id ? `org: ${p.org_id.slice(0,8)}…` : '❌ org_id=NULL'
      console.log(`   ${(p.full_name || '(no name)').padEnd(25)} | role: ${(p.role || 'null').padEnd(8)} | ${orgStatus} | id: ${p.id.slice(0,8)}…`)
    })
  }

  // ── 3. CROSS-JOIN: auth.users vs profiles ─────────────────────────────────
  console.log('\n── 3. AUTH USERS vs PROFILES ALIGNMENT ─────────────')
  if (users) {
    for (const u of users.slice(0, 6)) {
      const match = profiles?.find(p => p.id === u.id)
      if (!match) {
        console.log(`   ❌ NO PROFILE for auth user: ${u.email} (${u.id.slice(0,8)}…)`)
        console.log(`      → The signUpWithOwner action failed mid-way or was never called.`)
      } else if (!match.org_id) {
        console.log(`   ⚠️  PROFILE EXISTS but org_id=NULL for: ${u.email} (${u.id.slice(0,8)}…)`)
        console.log(`      → The organization insert step FAILED after profile was created.`)
      } else {
        console.log(`   ✅ OK: ${u.email} → profile exists, org_id=${match.org_id.slice(0,8)}…`)
      }
    }
  }

  // ── 4. ORGANIZATIONS TABLE ─────────────────────────────────────────────────
  console.log('\n── 4. ORGANIZATIONS (last 5) ───────────────────────')
  const { data: orgs, error: orgErr } = await admin
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (orgErr) {
    console.error('   ❌ Error reading organizations:', orgErr.message)
  } else if (!orgs || orgs.length === 0) {
    console.log('   ⚠️  NO ROWS in organizations table')
  } else {
    orgs.forEach(o => {
      console.log(`   "${o.name}" | slug: ${o.slug} | id: ${o.id.slice(0,8)}…`)
    })
  }

  // ── 5. RLS POLICIES ON PROFILES ────────────────────────────────────────────
  console.log('\n── 5. RLS POLICIES ON profiles TABLE ───────────────')
  // Use the PostgREST-friendly approach: query information_schema
  const rlsResult = await sql(`
    SELECT policyname, cmd, permissive, roles, qual
    FROM pg_policies
    WHERE tablename = 'profiles'
    ORDER BY cmd, policyname
  `)
  if (rlsResult.error || !rlsResult.data) {
    // Fallback: try via admin direct query
    console.log('   (exec_sql RPC not available, using alternative check)')
    
    // Try reading profiles with anon key to test RLS
    const anonClient = createClient(SUPABASE_URL, env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: anonRead, error: anonErr } = await anonClient
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (anonErr) {
      console.log(`   Anon read of profiles: BLOCKED (${anonErr.message})`)
      console.log(`   → This means the anon key can't see profiles.`)
      console.log(`   → The server client (which uses anon key + cookie session) likely CAN see profiles if the session is valid.`)
    } else {
      console.log(`   ⚠️  Anon read of profiles SUCCEEDED with ${anonRead?.length} rows visible`)
      console.log(`   → RLS might be too permissive or disabled entirely`)
    }
  } else {
    const policies = rlsResult.data
    if (!policies || policies.length === 0) {
      console.log('   ⚠️  NO RLS POLICIES FOUND on profiles!')
      console.log('   → If RLS is enabled but no policies exist, ALL reads return empty.')
    } else {
      policies.forEach(p => {
        console.log(`   [${p.cmd}] "${p.policyname}" | using: ${p.qual || 'none'}`)
      })
    }
  }

  // ── 6. CHECK FOR TRIGGER that creates profiles ─────────────────────────────
  console.log('\n── 6. TRIGGERS ON auth.users ───────────────────────')
  const triggerResult = await sql(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
  `)
  if (triggerResult.error) {
    console.log('   (exec_sql RPC not available - skipping trigger check)')
    console.log('   → Check Supabase Dashboard > Database > Triggers manually.')
  } else {
    const triggers = triggerResult.data
    if (!triggers || triggers.length === 0) {
      console.log('   ✅ No triggers on auth.users (good — you rely on the server action)')
    } else {
      triggers.forEach(t => {
        console.log(`   ⚠️  TRIGGER: "${t.trigger_name}" on ${t.event_manipulation}`)
        console.log(`      Action: ${t.action_statement}`)
        console.log(`      → This trigger might be creating a profile WITHOUT org_id, overwriting the one from signUpWithOwner!`)
      })
    }
  }

  // ── 7. TEST SIGNUP FLOW MANUALLY (dry run) ─────────────────────────────────
  console.log('\n── 7. TEST: Can admin insert to profiles with org_id? ─')
  
  // Find an existing org to test with
  const testOrg = orgs?.[0]
  if (!testOrg) {
    console.log('   (Skipping - no organizations exist to test with)')
  } else {
    // Just test inserting a profile row and immediately delete it
    const testId = '00000000-0000-0000-0000-000000000001'
    const { error: insertErr } = await admin.from('profiles').insert({
      id: testId,
      org_id: testOrg.id,
      role: 'owner',
      full_name: 'DIAGNOSIS TEST - SAFE TO DELETE',
    })

    if (insertErr) {
      console.log(`   ❌ Admin INSERT to profiles FAILED: ${insertErr.message}`)
      console.log(`   → Check profiles table schema — column might be missing.`)
    } else {
      console.log(`   ✅ Admin can insert to profiles with org_id`)
      // Clean up
      await admin.from('profiles').delete().eq('id', testId)
      console.log(`   ✅ Cleanup successful`)
    }
  }

  // ── 8. CHECK FOR RACE: does a Supabase auth trigger wipe org_id? ──────────
  console.log('\n── 8. DIAGNOSIS SUMMARY ────────────────────────────')
  
  const orphanedProfiles = profiles?.filter(p => !p.org_id) || []
  const noProfileUsers = users?.filter(u => !profiles?.find(p => p.id === u.id)) || []
  
  if (noProfileUsers.length > 0) {
    console.log(`\n   🔴 ROOT CAUSE: ${noProfileUsers.length} auth user(s) have NO profile row at all.`)
    console.log(`      This means signUpWithOwner fails BEFORE the profile insert step,`)
    console.log(`      OR the action is not being called at all (form submission issue).`)
    noProfileUsers.forEach(u => console.log(`      → ${u.email}`))
  } else if (orphanedProfiles.length > 0) {
    console.log(`\n   🟠 ROOT CAUSE: ${orphanedProfiles.length} profile(s) have org_id=NULL.`)
    console.log(`      The profile row EXISTS but org_id was never set.`)
    console.log(`      Most likely: a Supabase trigger auto-created the profile without org_id,`)
    console.log(`      then the signUpWithOwner UPDATE was blocked by a constraint or race condition.`)
    orphanedProfiles.forEach(p => console.log(`      → ${p.full_name || p.id}`))
  } else {
    console.log(`   ✅ All profiles have org_id set. The issue might be RLS on the dispatch page.`)
    console.log(`   → The dispatch page uses the regular client (anon key + session).`)
    console.log(`   → Fix: change dispatch/page.tsx to use createAdminClient() for profile reads.`)
  }
}

run().catch(err => {
  console.error('\n❌ Fatal error running diagnosis:', err.message)
  process.exit(1)
})
