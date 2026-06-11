import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = new URL('../.env', import.meta.url).pathname;
const normalizedEnvPath = process.platform === 'win32' && envPath.startsWith('/') ? envPath.slice(1) : envPath;
const envContent = fs.readFileSync(normalizedEnvPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function restoreMaquinas() {
  const backupFilePath = new URL('../backup.json', import.meta.url).pathname;
  const normalizedBackupPath = process.platform === 'win32' && backupFilePath.startsWith('/') ? backupFilePath.slice(1) : backupFilePath;
  const backupData = JSON.parse(fs.readFileSync(normalizedBackupPath, 'utf8'));

  const records = backupData['maquinas'];
  console.log(`Insertando ${records.length} registros en maquinas...`);
  const { data, error } = await supabase.from('maquinas').insert(records);
  
  if (error) {
    console.error(`Error insertando en maquinas:`, error.message);
  } else {
    console.log(`- maquinas restaurada exitosamente.`);
  }
}

restoreMaquinas().catch(console.error);
