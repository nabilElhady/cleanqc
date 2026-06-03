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
  console.log('Checking database tables and columns...');
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching organizations:', error);
  } else {
    console.log('Successfully connected to organizations!');
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log('Columns in organizations:', keys);
      console.log('Has subscription_status:', keys.includes('subscription_status'));
      console.log('Has paddle_subscription_id:', keys.includes('paddle_subscription_id'));
    } else {
      console.log('No records found in organizations.');
    }
  }

  // Also check profiles table
  const { data: profData, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  if (profError) {
    console.error('Error fetching profiles:', profError);
  } else if (profData.length > 0) {
    const keys = Object.keys(profData[0]);
    console.log('Columns in profiles:', keys);
    console.log('Has subscription_status:', keys.includes('subscription_status'));
    console.log('Has paddle_subscription_id:', keys.includes('paddle_subscription_id'));
  }
}

check();
