import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read env variables manually
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Supabase credentials not found in env:', { supabaseUrl, serviceRoleKey });
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);

async function resetDb() {
  console.log('--- Current Profiles ---');
  const { data: profiles, error: profErr } = await db
    .from('profiles')
    .select('*');
  
  if (profErr) {
    console.error('Profiles error:', profErr);
  } else {
    console.table(profiles.map(p => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      is_superadmin: p.is_superadmin,
      org_id: p.org_id
    })));
  }

  console.log('--- Current Organizations ---');
  const { data: orgs, error: orgsErr } = await db
    .from('organizations')
    .select('*');

  if (orgsErr) {
    console.error('Orgs error:', orgsErr);
  } else {
    console.table(orgs.map(o => ({
      id: o.id,
      name: o.name,
      subscription_status: o.subscription_status
    })));
  }

  // 1. Reset all organizations subscription status to null
  console.log('Resetting all organizations subscription status to null...');
  const { error: resetOrgsErr } = await db
    .from('organizations')
    .update({ subscription_status: null });

  if (resetOrgsErr) {
    console.error('Reset organizations error:', resetOrgsErr);
  } else {
    console.log('All organizations reset to null subscription status successfully!');
  }

  // 2. We can also toggle is_superadmin of our testing profile if needed
  // For example, if we want to ensure we're testing as a normal owner
  const targetEmail = 'nabilelhady73@gmail.com';
  const { data: { users } } = await db.auth.admin.listUsers();
  const testUser = users.find(u => u.email === targetEmail);
  if (testUser) {
    console.log(`Found test user: ${targetEmail} (ID: ${testUser.id})`);
    // Check if the profile is superadmin. Let's make sure role = 'owner' and is_superadmin = false to test the paywall!
    const userProfile = profiles?.find(p => p.id === testUser.id);
    if (userProfile && userProfile.is_superadmin) {
      console.log('Test user profile is currently a superadmin. Setting to normal owner...');
      
      // Let's get the first organization ID to associate them with
      const firstOrg = orgs?.[0];
      const orgId = firstOrg ? firstOrg.id : null;

      const { error: updateProfErr } = await db
        .from('profiles')
        .update({
          is_superadmin: false,
          role: 'owner',
          org_id: orgId
        })
        .eq('id', testUser.id);
      
      if (updateProfErr) {
        console.error('Failed to update test user profile:', updateProfErr);
      } else {
        console.log('Updated test user profile to normal owner (non-superadmin) successfully!');
      }
    }
  }
}

resetDb().catch(console.error);
