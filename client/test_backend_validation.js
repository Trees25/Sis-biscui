/**
 * Suite de Pruebas de Seguridad Backend (Peticiones Manipuladas Directas a la API)
 * --------------------------------------------------------------------------------
 * Este script ignora por completo el frontend de React y envía peticiones HTTP/PostgREST
 * manipuladas directamente a Supabase usando @supabase/supabase-js para demostrar que
 * el servidor rechaza datos corruptos, inyecciones XSS/Fórmulas, costos negativos
 * y operaciones no autorizadas (Crear, Editar, Eliminar, Costos/Pagos).
 *
 * Ejecución:
 *   node test_backend_validation.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Error] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tests = [
  {
    nombre: '1. [CREAR] Producto con XSS (<script>) y categoría inexistente directo a PostgREST',
    accion: async () => {
      return await supabase.from('productos').insert({
        nombre: '<script>alert("hacked")</script>',
        categoria: 'categoria_falsa_hackeada',
        cant_por_caja: -50
      });
    }
  },
  {
    nombre: '2. [CREAR] Proveedor con CUIT fraudulento y email malformado directo a PostgREST',
    accion: async () => {
      return await supabase.from('proveedores').insert({
        nombre: 'Proveedor Hack',
        cuit: '99-ABCDEFGH-Z',
        email: 'correo-sin-arroba-ni-dominio'
      });
    }
  },
  {
    nombre: '3. [PAGO/COSTO] Mantenimiento con costo financiero negativo (-99999) directo a PostgREST',
    accion: async () => {
      return await supabase.from('mantenimientos').insert({
        maquina_id: 1,
        descripcion: 'Intento de manipular costo financiero en negativo',
        costo: -99999
      });
    }
  },
  {
    nombre: '4. [RPC PRODUCCIÓN] Cantidad negativa (-500 kg) enviada directamente al RPC registrar_produccion',
    accion: async () => {
      return await supabase.rpc('registrar_produccion', {
        p_codigo_lote: 'L-HACK-0001',
        p_producto_id: 1,
        p_cantidad: -500,
        p_pesos: [-10, -20],
        p_fecha_produccion: new Date().toISOString(),
        p_creado_por: 1,
        p_es_evento: false
      });
    }
  },
  {
    nombre: '5. [RPC CONSUMO] Consumo negativo o superior al stock enviado directamente al RPC registrar_consumo',
    accion: async () => {
      return await supabase.rpc('registrar_consumo', {
        p_sucursal_id: 1,
        p_producto_id: 1,
        p_cantidad: -250,
        p_es_evento: false,
        p_creado_por: 1
      });
    }
  },
  {
    nombre: '6. [EDITAR] Intento de inyectar stock negativo (-1000) directo en stock_sucursales',
    accion: async () => {
      return await supabase
        .from('stock_sucursales')
        .update({ cantidad: -1000 })
        .eq('sucursal_id', 1)
        .eq('producto_id', 1)
        .select();
    }
  },
  {
    nombre: '7. [ELIMINAR] Intento de eliminar catálogo de productos sin autorización de Administrador',
    accion: async () => {
      return await supabase
        .from('productos')
        .delete()
        .eq('id', 1)
        .select();
    }
  }
];

async function runSuite() {
  console.log('================================================================================');
  console.log(' EJECUTANDO PRUEBAS DE PETICIONES MANIPULADAS CONTRA EL BACKEND (SUPABASE API)');
  console.log('================================================================================\n');

  let passed = 0;

  for (const t of tests) {
    const { data, error } = await t.accion();
    const isNetworkError = error && String(error.message || '').includes('fetch failed');
    const blockedByError = Boolean(error) && !isNetworkError;
    const blockedByZeroRows = !error && Array.isArray(data) && data.length === 0;

    if (isNetworkError) {
      console.log(`❌  ERROR DE RED           | ${t.nombre}`);
      console.log(`   ↳ No se pudo conectar a Supabase: ${error.message}\n`);
    } else if (blockedByError || blockedByZeroRows) {
      passed++;
      const reason = error
        ? `${error.code || 'PG_ERR'}: ${error.message}`
        : 'Bloqueado por política RLS en servidor (0 filas afectadas)';
      console.log(`🛡️  RECHAZADO POR SERVIDOR | ${t.nombre}`);
      console.log(`   ↳ Respuesta del Backend: ${reason}\n`);
    } else {
      console.log(`⚠️  ALERTA (NO RECHAZADO)  | ${t.nombre}`);
      console.log('   ↳ Asegúrate de haber ejecutado supabase/validation_constraints.sql en el SQL Editor.\n');
    }
  }

  console.log('================================================================================');
  console.log(` RESULTADO FINAL: ${passed}/${tests.length} peticiones manipuladas rechazadas por el servidor.`);
  console.log('================================================================================');
}

runSuite();

