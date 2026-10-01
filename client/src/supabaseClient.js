import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://zjluelhistvgzcpgymng.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbHVlbGhpc3R2Z3pjcGd5bW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk3NjAsImV4cCI6MjA5NTQ1NTc2MH0.-1TvBKDGV33Hz3gW-vMQoS7Za-MBolzI0CA0IYhmkmA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

