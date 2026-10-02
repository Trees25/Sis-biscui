import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjluelhistvgzcpgymng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbHVlbGhpc3R2Z3pjcGd5bW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk3NjAsImV4cCI6MjA5NTQ1NTc2MH0.-1TvBKDGV33Hz3gW-vMQoS7Za-MBolzI0CA0IYhmkmA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const t1 = await supabase.from('lotes_produccion').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('lotes_produccion:', t1.data);
  const t2 = await supabase.from('productos').select('*').order('created_at', { ascending: false }).limit(2);
  console.log('productos:', t2.data);
  const t3 = await supabase.from('ordenes_produccion').select('*').order('created_at', { ascending: false }).limit(2);
  console.log('ordenes_produccion:', t3.data);
}

test();
