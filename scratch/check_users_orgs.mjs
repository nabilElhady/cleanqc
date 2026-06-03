import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

let supabaseUrl = '';
let serviceRoleKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
  }
} catch (e) {
  console.error('Failed to read .env.local:', e.message);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: missing Supabase env variables', { supabaseUrl, serviceRoleKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log('--- Organizations ---');
  const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('*');
  if (orgsErr) console.error(orgsErr);
  else console.log(orgs);

  console.log('--- Profiles ---');
  const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('*');
  if (profilesErr) console.error(profilesErr);
  else console.log(profiles);
}

check();
