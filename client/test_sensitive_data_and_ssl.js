/**
 * Script de Verificación de Datos Sensibles, Hashing Bcrypt y Conexión SSL/HTTPS
 * Archivo: test_sensitive_data_and_ssl.js
 *
 * Ejecutar con:
 *   node test_sensitive_data_and_ssl.js
 */
import fs from 'fs';
import tls from 'tls';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function checkTlsCertificate(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: true },
      () => {
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        const authorized = socket.authorized;
        socket.end();
        resolve({ authorized, protocol, cipherName: cipher?.name });
      }
    );
    socket.on('error', err => reject(err));
  });
}

async function runChecks() {
  console.log('================================================================================');
  console.log(' VERIFICACIÓN DE HASHING DE CONTRASEÑAS, CIFRADO Y CONEXIONES SSL/HTTPS');
  console.log('================================================================================\n');

  let passed = 0;
  const total = 5;

  // 1. Verificar protocolo HTTPS estricto en la URL de configuración
  const parsedUrl = new URL(SUPABASE_URL);
  const isHttps = parsedUrl.protocol === 'https:';
  if (isHttps) passed++;
  console.log(
    `${isHttps ? '🛡️  SEGURO (OK)' : '⚠️  INSEGURO'} | 1. Protocolo de conexión configurado: ${parsedUrl.protocol}//${parsedUrl.host}`
  );

  // 2. Verificar certificado SSL/TLS real contra el servidor de Supabase (Puerto 443)
  try {
    const tlsInfo = await checkTlsCertificate(parsedUrl.hostname);
    if (tlsInfo.authorized && (tlsInfo.protocol === 'TLSv1.3' || tlsInfo.protocol === 'TLSv1.2')) {
      passed++;
      console.log(
        `🛡️  SEGURO (OK) | 2. Handshake SSL/TLS verificado: ${tlsInfo.protocol} (${tlsInfo.cipherName})`
      );
    } else {
      console.log(`⚠️  ALERTA      | 2. SSL/TLS no autorizado o versión antigua:`, tlsInfo);
    }
  } catch (err) {
    console.log(`⚠️  ERROR RED   | 2. No se pudo verificar el socket TLS: ${err.message}`);
  }

  // 3. Verificar que la columna public.usuarios.password esté bloqueada a nivel de privilegios de columna
  const { error: pwdColErr } = await supabase.from('usuarios').select('password').limit(1);
  const isPasswordColRevoked = Boolean(pwdColErr);
  if (isPasswordColRevoked) passed++;
  console.log(
    `${isPasswordColRevoked ? '🛡️  BLOQUEADO (OK)' : '⚠️  EXPUESTO'} | 3. Intento de leer columna "password" desde la API pública`
  );
  if (pwdColErr) {
    console.log(`   ↳ Respuesta del Servidor: ${pwdColErr.code} - ${pwdColErr.message}`);
  }

  // 4. Verificar que las columnas cifradas crudas (BYTEA) de proveedores no sean legibles directamente por anon/authenticated
  const { error: encColErr } = await supabase
    .from('proveedores')
    .select('cuit_encrypted, datos_contacto_encrypted')
    .limit(1);
  const isEncColProtected = Boolean(encColErr);
  if (isEncColProtected) passed++;
  console.log(
    `${isEncColProtected ? '🛡️  BLOQUEADO (OK)' : '⚠️  PENDIENTE'} | 4. Protección de columnas cifradas (cuit_encrypted / datos_contacto_encrypted)`
  );
  if (encColErr) {
    console.log(`   ↳ Respuesta del Servidor: ${encColErr.code} - ${encColErr.message}`);
  }

  // 5. Ejecutar auditoría criptográfica interna (RPC verificar_estado_seguridad_datos)
  const { data: auditData, error: auditErr } = await supabase.rpc('verificar_estado_seguridad_datos');
  if (auditErr) {
    console.log(
      `⚠️  PENDIENTE   | 5. Auditoría de hashes bcrypt y cifrado AES-256 (ejecuta supabase/sensitive_data_protection.sql en el SQL Editor)`
    );
    console.log(`   ↳ Detalle: ${auditErr.message}`);
  } else {
    const allAuthBcrypt = auditData.auth_users_total === auditData.auth_users_bcrypt_ok;
    const zeroPlaintext = auditData.public_usuarios_plaintext_passwords === 0;
    const sslActive = auditData.postgres_backend_ssl_active === true;
    if (allAuthBcrypt && zeroPlaintext && sslActive) passed++;

    console.log(
      `${allAuthBcrypt && zeroPlaintext && sslActive ? '🛡️  SEGURO (OK)' : '⚠️  REVISAR'} | 5. Auditoría interna en PostgreSQL:`
    );
    console.log(`   ↳ Cuentas en auth.users con hash bcrypt: ${auditData.auth_users_bcrypt_ok}/${auditData.auth_users_total}`);
    console.log(`   ↳ Contraseñas en texto plano en public.usuarios: ${auditData.public_usuarios_plaintext_passwords} (Con bcrypt: ${auditData.public_usuarios_bcrypt_passwords})`);
    console.log(`   ↳ Proveedores con respaldo cifrado AES-256 (pgcrypto): ${auditData.proveedores_cifrados_aes256}`);
    console.log(`   ↳ Conexión interna PostgreSQL con SSL activo: ${auditData.postgres_backend_ssl_active}`);
  }

  console.log('\n================================================================================');
  console.log(` RESULTADO FINAL: ${passed}/${total} verificaciones de datos sensibles y SSL superadas.`);
  console.log('================================================================================');
}

runChecks().catch(err => {
  console.error('❌ Error en verificación:', err.message);
  process.exit(1);
});

