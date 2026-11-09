/**
 * Script de Prueba de Políticas RLS con Dos Usuarios Diferentes
 * Archivo: test_rls_two_users.js
 *
 * Cómo ejecutarlo:
 *   USER_A_EMAIL="sucursal1@biscui.com" USER_A_PASS="..." \
 *   USER_B_EMAIL="sucursal2@biscui.com" USER_B_PASS="..." \
 *   node test_rls_two_users.js
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env sin exponer secretos
const envText = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

// Crear dos clientes independientes en memoria (sin persistir sesión compartida)
const createIsolatedClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

async function runTwoUserTests() {
  const userAEmail = process.env.USER_A_EMAIL;
  const userAPass = process.env.USER_A_PASS;
  const userBEmail = process.env.USER_B_EMAIL;
  const userBPass = process.env.USER_B_PASS;

  console.log('================================================================================');
  console.log(' PRUEBA DE AISLAMIENTO RLS ENTRE DOS USUARIOS (USUARIO A vs USUARIO B)');
  console.log('================================================================================\n');

  if (!userAEmail || !userAPass || !userBEmail || !userBPass) {
    console.log('ℹ️  Para ejecutar la prueba en vivo desde Node.js con dos usuarios reales,');
    console.log('   define las credenciales de dos usuarios de distinta sucursal en PowerShell:\n');
    console.log('   $env:USER_A_EMAIL="usuario_sucursal_a@tu-dominio.com"');
    console.log('   $env:USER_A_PASS="tu_password_a"');
    console.log('   $env:USER_B_EMAIL="usuario_sucursal_b@tu-dominio.com"');
    console.log('   $env:USER_B_PASS="tu_password_b"');
    console.log('   node test_rls_two_users.js\n');
    console.log('💡 También puedes probar el aislamiento SIN necesitar contraseñas ejecutando');
    console.log('   el bloque de simulación transaccional (BEGIN ... ROLLBACK) en el SQL Editor');
    console.log('   de Supabase incluido en la guía.');
    return;
  }

  const clientA = createIsolatedClient();
  const clientB = createIsolatedClient();

  // 1. Iniciar sesión con ambos usuarios
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: userAEmail,
    password: userAPass
  });
  if (errA) throw new Error(`Error login Usuario A: ${errA.message}`);

  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: userBEmail,
    password: userBPass
  });
  if (errB) throw new Error(`Error login Usuario B: ${errB.message}`);

  // 2. Obtener perfil propio de cada usuario
  const { data: profileA } = await clientA
    .from('usuarios')
    .select('id, auth_id, nombre, rol, sucursal_id')
    .eq('auth_id', authA.user.id)
    .single();

  const { data: profileB } = await clientB
    .from('usuarios')
    .select('id, auth_id, nombre, rol, sucursal_id')
    .eq('auth_id', authB.user.id)
    .single();

  console.log(`👤 Usuario A: ${profileA.nombre} (id=${profileA.id}, rol=${profileA.rol}, sucursal_id=${profileA.sucursal_id})`);
  console.log(`👤 Usuario B: ${profileB.nombre} (id=${profileB.id}, rol=${profileB.rol}, sucursal_id=${profileB.sucursal_id})\n`);

  // PRUEBA 1: Usuario A intenta leer el perfil de Usuario B en public.usuarios
  const { data: crossUserRead } = await clientA
    .from('usuarios')
    .select('id, nombre, email')
    .eq('auth_id', authB.user.id);

  const test1Pass = !crossUserRead || crossUserRead.length === 0;
  console.log(
    `${test1Pass ? '🛡️  BLOQUEADO (OK)' : '⚠️  EXPUESTO (FALLO)'} | 1. Usuario A intenta leer el perfil de Usuario B en public.usuarios (${crossUserRead?.length || 0} filas devueltas)`
  );

  // PRUEBA 2: Aislamiento de pedidos y consumos según el rol
  // Si Usuario B es sucursal, verificamos que NO pueda leer pedidos de otra sucursal distinta a la suya;
  // y que Usuario A NO pueda leer los consumos internos (consumo_diario) de la Sucursal de Usuario B.
  const { data: crossConsumoRead } = await clientA
    .from('consumo_diario')
    .select('id, sucursal_id, cantidad')
    .eq('sucursal_id', profileB.sucursal_id);

  const { data: crossBranchOrdersRead } = await clientB
    .from('pedidos')
    .select('id, sucursal_destino_id')
    .neq('sucursal_destino_id', profileB.sucursal_id);

  const test2Pass =
    (!crossConsumoRead || crossConsumoRead.length === 0) &&
    (!crossBranchOrdersRead || crossBranchOrdersRead.length === 0);
  console.log(
    `${test2Pass ? '🛡️  BLOQUEADO (OK)' : '⚠️  EXPUESTO (FALLO)'} | 2. Aislamiento de registros privados: Usuario A lee consumo_diario de Sucursal B (${crossConsumoRead?.length || 0} filas) / Usuario B lee pedidos de otras sucursales (${crossBranchOrdersRead?.length || 0} filas)`
  );

  // PRUEBA 3: Usuario A intenta insertar un consumo diario a nombre de la Sucursal de Usuario B
  const { error: crossConsumoErr } = await clientA.from('consumo_diario').insert({
    sucursal_id: profileB.sucursal_id,
    producto_id: 1,
    cantidad: 1,
    creado_por: profileB.id,
    es_evento: false
  });

  const test3Pass = Boolean(crossConsumoErr);
  console.log(
    `${test3Pass ? '🛡️  BLOQUEADO (OK)' : '⚠️  PERMITIDO (FALLO)'} | 3. Usuario A intenta insertar consumo_diario en la Sucursal de Usuario B`
  );
  if (crossConsumoErr) {
    console.log(`   ↳ Respuesta RLS: ${crossConsumoErr.code} - ${crossConsumoErr.message}`);
  }

  // PRUEBA 4: Usuario A intenta alterar el stock de la Sucursal de Usuario B
  const { data: crossStockUpd, error: crossStockErr } = await clientA
    .from('stock_sucursales')
    .update({ cantidad: 9999 })
    .eq('sucursal_id', profileB.sucursal_id)
    .select();

  const test4Pass = Boolean(crossStockErr) || !crossStockUpd || crossStockUpd.length === 0;
  console.log(
    `${test4Pass ? '🛡️  BLOQUEADO (OK)' : '⚠️  PERMITIDO (FALLO)'} | 4. Usuario A intenta modificar stock_sucursales de la Sucursal de Usuario B`
  );

  // PRUEBA 5 (Bidireccional): Usuario B (sucursal) intenta eliminar lotes_produccion de Usuario A (fábrica)
  const { data: crossLoteDel, error: crossLoteErr } = await clientB
    .from('lotes_produccion')
    .delete()
    .eq('creado_por', profileA.id)
    .select();

  const test5Pass = Boolean(crossLoteErr) || !crossLoteDel || crossLoteDel.length === 0;
  console.log(
    `${test5Pass ? '🛡️  BLOQUEADO (OK)' : '⚠️  PERMITIDO (FALLO)'} | 5. Usuario B intenta eliminar lotes_produccion creados por Usuario A (${crossLoteDel?.length || 0} filas afectadas)`
  );

  const passedCount = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass].filter(Boolean).length;
  console.log('\n================================================================================');
  console.log(` RESULTADO FINAL: ${passedCount}/5 pruebas de aislamiento entre usuarios superadas.`);
  console.log('================================================================================');
}

runTwoUserTests().catch(err => {
  console.error('❌ Error ejecutando pruebas RLS:', err.message);
  process.exit(1);
});

