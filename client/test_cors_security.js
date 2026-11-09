/**
 * Script de Verificación de Configuración CORS (Orígenes Permitidos vs Rechazados)
 * Archivo: test_cors_security.js
 *
 * Verifica:
 *  1. Política CORS local (Vite / Frontend) para dominios de producción y localhost.
 *  2. Rechazo local de orígenes externos maliciosos y "Origin: null".
 *  3. Petición real a Supabase desde origen de producción permitido (https://sis-biscui.vercel.app).
 *  4. Petición real a Supabase desde origen local de desarrollo (http://localhost:5173).
 *  5. Bloqueo real en el servidor Supabase ante un origen externo no autorizado (https://sitio-malicioso.com).
 *
 * Ejecutar con:
 *   node test_cors_security.js
 */
import fs from 'fs';
import { isOriginAllowed, getAllowedOrigins } from './src/utils/corsConfig.js';

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

async function probeSupabaseWithOrigin(originHeader) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sucursales?select=id&limit=1`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Origin: originHeader
    }
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, ok: res.ok, body };
}

async function runCorsTests() {
  console.log('================================================================================');
  console.log(' PRUEBA DE SEGURIDAD CORS: ORÍGENES PERMITIDOS VS RECHAZADOS');
  console.log('================================================================================\n');
  console.log('📋 Lista blanca configurada:', getAllowedOrigins().join(', '), '\n');

  let passed = 0;
  const total = 5;

  // 1. Verificar orígenes permitidos en el validador de Vite / Frontend
  const prodAllowed = isOriginAllowed('https://sis-biscui.vercel.app');
  const localAllowed = isOriginAllowed('http://localhost:5173') && isOriginAllowed('http://127.0.0.1:5173');
  const check1 = prodAllowed && localAllowed;
  if (check1) passed++;
  console.log(
    `${check1 ? '🛡️  PERMITIDO (OK)' : '⚠️  FALLO'} | 1. Validador Vite/Frontend acepta dominio de producción y localhost:5173`
  );

  // 2. Verificar rechazo de orígenes no autorizados en el validador de Vite / Frontend
  const evilRejected = !isOriginAllowed('https://sitio-atacante.com');
  const wrongPortRejected = !isOriginAllowed('http://localhost:9999');
  const nullOriginRejected = !isOriginAllowed('null');
  const check2 = evilRejected && wrongPortRejected && nullOriginRejected;
  if (check2) passed++;
  console.log(
    `${check2 ? '🛡️  BLOQUEADO (OK)' : '⚠️  FALLO'} | 2. Validador Vite/Frontend rechaza https://sitio-atacante.com, localhost:9999 y Origin: null`
  );

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️  Faltan variables en .env para ejecutar las pruebas contra Supabase.');
    return;
  }

  // 3. Probar petición real a Supabase con Origin de Producción permitido
  try {
    const prodProbe = await probeSupabaseWithOrigin('https://sis-biscui.vercel.app');
    const isBlockedByCors = prodProbe.body?.hint === 'CORS_ORIGIN_DENIED';
    const check3 = !isBlockedByCors && (prodProbe.status === 200 || prodProbe.status === 401);
    if (check3) passed++;
    console.log(
      `${check3 ? '🛡️  PERMITIDO (OK)' : '⚠️  RECHAZADO'} | 3. Petición API con Origin de Producción (https://sis-biscui.vercel.app) -> HTTP ${prodProbe.status}`
    );
  } catch (err) {
    console.log(`⚠️  ERROR RED      | 3. Prueba de origen de producción: ${err.message}`);
  }

  // 4. Probar petición real a Supabase con Origin Local permitido
  try {
    const localProbe = await probeSupabaseWithOrigin('http://localhost:5173');
    const isBlockedByCors = localProbe.body?.hint === 'CORS_ORIGIN_DENIED';
    const check4 = !isBlockedByCors && (localProbe.status === 200 || localProbe.status === 401);
    if (check4) passed++;
    console.log(
      `${check4 ? '🛡️  PERMITIDO (OK)' : '⚠️  RECHAZADO'} | 4. Petición API con Origin Local (http://localhost:5173) -> HTTP ${localProbe.status}`
    );
  } catch (err) {
    console.log(`⚠️  ERROR RED      | 4. Prueba de origen local: ${err.message}`);
  }

  // 5. Probar petición real a Supabase con Origin Externo NO autorizado
  try {
    const evilProbe = await probeSupabaseWithOrigin('https://sitio-malicioso.com');
    const isBlockedByCors =
      evilProbe.body?.code === '42501' ||
      evilProbe.body?.hint === 'CORS_ORIGIN_DENIED' ||
      (typeof evilProbe.body?.message === 'string' && evilProbe.body.message.includes('CORS'));

    if (isBlockedByCors) passed++;
    console.log(
      `${isBlockedByCors ? '🛡️  BLOQUEADO (OK)' : '⚠️  EXPUESTO (EJECUTAR SQL)'} | 5. Petición API desde origen externo no autorizado (https://sitio-malicioso.com)`
    );
    if (isBlockedByCors) {
      console.log(`   ↳ Respuesta del Servidor: ${evilProbe.body.code} - ${evilProbe.body.message}`);
    } else {
      console.log(
        `   ↳ Aún permite cualquier origen. Ejecuta supabase/cors_protection.sql en el SQL Editor de Supabase.`
      );
    }
  } catch (err) {
    console.log(`⚠️  ERROR RED      | 5. Prueba de origen malicioso: ${err.message}`);
  }

  console.log('\n================================================================================');
  console.log(` RESULTADO FINAL: ${passed}/${total} verificaciones CORS superadas.`);
  console.log('================================================================================');
}

runCorsTests();

