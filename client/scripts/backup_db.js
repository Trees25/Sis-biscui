import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envPath = new URL('../.env', import.meta.url).pathname;
// Remove leading slash on windows
const normalizedEnvPath = process.platform === 'win32' && envPath.startsWith('/') ? envPath.slice(1) : envPath;

let envContent = '';
try {
  envContent = fs.readFileSync(normalizedEnvPath, 'utf8');
} catch (e) {
  console.error("Could not read .env file. Please run this script from the scripts folder.");
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupData() {
  console.log('Iniciando backup de datos maestros...');
  const tables = ['sucursales', 'usuarios', 'proveedores', 'productos', 'maquinas'];
  const backup = {};

  for (const table of tables) {
    console.log(`Descargando ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error al descargar ${table}:`, error.message);
      if (error.code !== '42P01') { // Ignore relation does not exist error if it's completely missing
        process.exit(1);
      }
      backup[table] = [];
    } else {
      backup[table] = data;
      console.log(`- ${data.length} registros descargados.`);
    }
  }

  const backupFilePath = new URL('../backup.json', import.meta.url).pathname;
  const normalizedBackupPath = process.platform === 'win32' && backupFilePath.startsWith('/') ? backupFilePath.slice(1) : backupFilePath;
  
  fs.writeFileSync(normalizedBackupPath, JSON.stringify(backup, null, 2));
  console.log(`Backup guardado exitosamente en: ${normalizedBackupPath}`);
}

backupData().catch(console.error);
