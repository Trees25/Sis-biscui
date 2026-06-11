import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envPath = new URL('../.env', import.meta.url).pathname;
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

async function restoreData() {
  console.log('Iniciando restauración de datos maestros...');
  
  const backupFilePath = new URL('../backup.json', import.meta.url).pathname;
  const normalizedBackupPath = process.platform === 'win32' && backupFilePath.startsWith('/') ? backupFilePath.slice(1) : backupFilePath;
  
  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(normalizedBackupPath, 'utf8'));
  } catch(e) {
    console.error('No se encontró backup.json. Debes ejecutar backup_db.js primero.');
    process.exit(1);
  }

  // Orden de inserción para respetar las llaves foráneas (Foreign Keys)
  const tables = ['sucursales', 'usuarios', 'proveedores', 'productos', 'maquinas'];

  for (const table of tables) {
    const records = backupData[table];
    if (!records || records.length === 0) {
      console.log(`Tabla ${table} vacía en el backup. Saltando...`);
      continue;
    }
    
    console.log(`Insertando ${records.length} registros en ${table}...`);
    const { data, error } = await supabase.from(table).insert(records);
    
    if (error) {
      console.error(`Error insertando en ${table}:`, error.message);
      // Podría fallar si hay conflictos de ID. Como la BD es nueva, no debería.
      process.exit(1);
    } else {
      console.log(`- ${table} restaurada exitosamente.`);
    }
  }

  console.log('¡Restauración completada!');
}

restoreData().catch(console.error);
