import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY). Configúralas en tu archivo .env.'
  );
}

// Verificar obligatoriamente que la conexión hacia la base de datos/API use HTTPS (SSL/TLS)
let parsedSupabaseUrl;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  throw new Error('VITE_SUPABASE_URL no tiene un formato de URL válido.');
}

if (parsedSupabaseUrl.protocol !== 'https:') {
  throw new Error(
    'Conexión insegura bloqueada: VITE_SUPABASE_URL debe utilizar obligatoriamente HTTPS (SSL/TLS).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});



