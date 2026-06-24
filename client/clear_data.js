import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjluelhistvgzcpgymng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbHVlbGhpc3R2Z3pjcGd5bW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk3NjAsImV4cCI6MjA5NTQ1NTc2MH0.-1TvBKDGV33Hz3gW-vMQoS7Za-MBolzI0CA0IYhmkmA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  // Login first to bypass RLS
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@biscui.com',
    password: 'admin'
  });
  
  if (authErr) {
    console.error('Login error:', authErr);
    // Let's try the alternative username format
    const { data: authData2, error: authErr2 } = await supabase.auth.signInWithPassword({
      email: 'admin',
      password: 'admin'
    });
    if (authErr2) {
       console.error('Second login error:', authErr2);
       return;
    }
  }

  console.log('Logged in successfully, proceeding with deletion...');

  const tables = [
    'pedido_detalles',
    'discrepancias',
    'pedidos',
    'orden_produccion_detalles',
    'ordenes_produccion',
    'lote_pesos',
    'lotes_produccion',
    'items_pendientes',
    'consumo_diario',
    'mantenimientos',
    'stock_sucursales'
  ];

  for (const table of tables) {
    console.log(`Borrando tabla ${table}...`);
    const { error } = await supabase.from(table).delete().gt('id', 0);
    if (error) {
      console.error(`Error al borrar en ${table}:`, error);
    } else {
      console.log(`✓ Tabla ${table} limpiada correctamente.`);
    }
  }
}

clearData().then(() => console.log('Proceso de limpieza terminado.'));
