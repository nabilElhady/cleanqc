import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read env variables manually
const envPath = path.resolve('f:/lambda-layers/lambdas/comments/nextjs-complete-guide-course-resources/code/02-nextjs-essentials/supbase/cleanqc/.env.local');
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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log('Fetching profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .limit(20);

  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }

  console.log('\nPROFILES:');
  console.table(profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    org_id: p.org_id,
    role: p.role
  })));

  console.log('\nFetching organizations...');
  const { data: orgs, error: oError } = await supabase
    .from('organizations')
    .select('*')
    .limit(20);

  if (oError) {
    console.error('Error fetching organizations:', oError);
    return;
  }

  console.log('\nORGANIZATIONS:');
  console.table(orgs.map(o => ({
    id: o.id,
    name: o.name,
    subscription_status: o.subscription_status,
    paddle_subscription_id: o.paddle_subscription_id,
    stripe_subscription_id: o.stripe_subscription_id
  })));
}

check().catch(console.error);
