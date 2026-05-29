import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn(
    'Supabase credentials are missing or using placeholder! Please set VITE_SUPABASE_ANON_KEY in frontend/.env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
