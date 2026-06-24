import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjluelhistvgzcpgymng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbHVlbGhpc3R2Z3pjcGd5bW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk3NjAsImV4cCI6MjA5NTQ1NTc2MH0.-1TvBKDGV33Hz3gW-vMQoS7Za-MBolzI0CA0IYhmkmA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('mantenimientos').select(`
    *,
    maquinas:maquinas!mantenimientos_maquina_id_fkey ( nombre, marca, modelo, tipo_equipo )
  `);
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS! Data returned.');
    if (data && data.length > 0) {
      console.log('Is array?', Array.isArray(data[0].maquinas));
      console.log('Type:', typeof data[0].maquinas);
    } else {
      console.log('No data returned (due to RLS).');
    }
  }
}

test();
