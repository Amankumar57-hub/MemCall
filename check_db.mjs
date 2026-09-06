import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = '/Users/aman/Desktop/MemCall/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: alerts } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Recent Alerts:', alerts);
  
  const { data: links } = await supabase.from('caregiver_patient_links').select('*');
  console.log('Links:', links);
  
  const { data: users } = await supabase.from('users').select('id, full_name, role');
  console.log('Users:', users);
}
run();
