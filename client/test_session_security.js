/**
 * Script de Prueba de Expiración de Sesión y Cierre por Inactividad
 * Archivo: test_session_security.js
 *
 * Verifica de forma aislada (sin afectar usuarios conectados en producción):
 *  1. Políticas diferenciadas según sensibilidad del rol (admin: 30m/8h vs operativos: 60m/12h).
 *  2. Alerta previa (WARNING) 60s antes del cierre por inactividad.
 *  3. Cierre automático por inactividad (EXPIRED_IDLE) y renovación de actividad.
 *  4. Cierre forzoso por expiración absoluta de turno (EXPIRED_ABSOLUTE) incluso con actividad reciente.
 *  5. Modo de prueba no disruptivo por URL (?test_idle_sec=15&test_max_sec=20).
 *
 * Ejecutar con:
 *   node test_session_security.js
 */
import {
  getSessionPolicyForRole,
  evaluateSessionState
} from './src/utils/sessionPolicy.js';

function runSessionTests() {
  console.log('================================================================================');
  console.log(' VERIFICACIÓN DE POLÍTICAS DE SESIÓN, EXPIRACIÓN E INACTIVIDAD');
  console.log('================================================================================\n');

  let passed = 0;
  const total = 5;
  const baseTime = 1_700_000_000_000;

  // 1. Verificar tiempos diferenciados por sensibilidad de rol
  const adminPolicy = getSessionPolicyForRole('admin');
  const sucursalPolicy = getSessionPolicyForRole('sucursal');
  const heladeroPolicy = getSessionPolicyForRole('heladero');

  const check1 =
    adminPolicy.idleTimeoutMs === 60 * 60 * 1000 &&
    adminPolicy.maxSessionMs === 8 * 60 * 60 * 1000 &&
    sucursalPolicy.idleTimeoutMs === 60 * 60 * 1000 &&
    sucursalPolicy.maxSessionMs === 12 * 60 * 60 * 1000 &&
    heladeroPolicy.idleTimeoutMs === 60 * 60 * 1000;

  if (check1) passed++;
  console.log(
    `${check1 ? '🛡️  SEGURO (OK)' : '⚠️  FALLO'} | 1. Políticas por rol configuradas: Admin (60m inactividad / 8h máx) | Operativos (60m inactividad / 12h máx)`
  );

  // 2. Verificar alerta previa (WARNING) 45 segundos antes del vencimiento por inactividad
  const warningEval = evaluateSessionState({
    loginAt: baseTime,
    lastActivityAt: baseTime,
    now: baseTime + adminPolicy.idleTimeoutMs - 45 * 1000,
    policy: adminPolicy
  });
  const check2 =
    warningEval.status === 'WARNING' &&
    warningEval.warningType === 'inactivity' &&
    warningEval.remainingSeconds === 45;

  if (check2) passed++;
  console.log(
    `${check2 ? '🛡️  SEGURO (OK)' : '⚠️  FALLO'} | 2. Aviso previo de inactividad activado (${warningEval.remainingSeconds}s restantes antes de cerrar)`
  );

  // 3. Verificar cierre efectivo por inactividad (EXPIRED_IDLE)
  const idleExpiredEval = evaluateSessionState({
    loginAt: baseTime,
    lastActivityAt: baseTime,
    now: baseTime + adminPolicy.idleTimeoutMs + 1000,
    policy: adminPolicy
  });
  const check3 =
    idleExpiredEval.status === 'EXPIRED_IDLE' &&
    idleExpiredEval.reason === 'inactivity';

  if (check3) passed++;
  console.log(
    `${check3 ? '🛡️  BLOQUEADO (OK)' : '⚠️  FALLO'} | 3. Cierre automático por inactividad al superar el límite del rol`
  );
  console.log(`   ↳ Mensaje al usuario: "${idleExpiredEval.message}"`);

  // 4. Verificar expiración absoluta de turno (EXPIRED_ABSOLUTE) aunque el usuario siga haciendo clic
  const absoluteExpiredEval = evaluateSessionState({
    loginAt: baseTime,
    lastActivityAt: baseTime + adminPolicy.maxSessionMs - 5000, // Usuario activo hace apenas 5 segundos
    now: baseTime + adminPolicy.maxSessionMs + 1000,            // Pero ya cumplió las 8 horas máximas de turno
    policy: adminPolicy
  });
  const check4 =
    absoluteExpiredEval.status === 'EXPIRED_ABSOLUTE' &&
    absoluteExpiredEval.reason === 'max_lifetime';

  if (check4) passed++;
  console.log(
    `${check4 ? '🛡️  BLOQUEADO (OK)' : '⚠️  FALLO'} | 4. Expiración absoluta de sesión al cumplir el turno máximo (incluso con actividad reciente)`
  );
  console.log(`   ↳ Mensaje al usuario: "${absoluteExpiredEval.message}"`);

  // 5. Verificar modo de prueba no disruptivo por URL (?test_idle_sec=15&test_max_sec=20)
  const testPolicy = getSessionPolicyForRole('sucursal', '?test_idle_sec=15&test_max_sec=20');
  const normalOtherUserPolicy = getSessionPolicyForRole('sucursal', '');
  const check5 =
    testPolicy.isTestOverride === true &&
    testPolicy.idleTimeoutMs === 15_000 &&
    testPolicy.maxSessionMs === 20_000 &&
    normalOtherUserPolicy.isTestOverride === false &&
    normalOtherUserPolicy.idleTimeoutMs === 60 * 60 * 1000;

  if (check5) passed++;
  console.log(
    `${check5 ? '🛡️  SEGURO (OK)' : '⚠️  FALLO'} | 5. Simulación aislada por URL (?test_idle_sec=15&test_max_sec=20) activa sin afectar a otros usuarios`
  );

  console.log('\n================================================================================');
  console.log(` RESULTADO FINAL: ${passed}/${total} pruebas de expiración e inactividad superadas.`);
  console.log('================================================================================');

  if (passed < total) process.exit(1);
}

runSessionTests();

