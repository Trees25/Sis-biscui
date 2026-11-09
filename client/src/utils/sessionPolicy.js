/**
 * Políticas de Duración de Sesión y Cierre por Inactividad
 * Archivo: src/utils/sessionPolicy.js
 *
 * Define los tiempos máximos de sesión (Time-box absoluto) y de inactividad (Idle Timeout)
 * según la sensibilidad de cada rol, además de permitir pruebas locales no disruptivas
 * mediante parámetros de URL (?test_idle_sec=15&test_max_sec=20).
 */

export const SESSION_STORAGE_KEY = 'biscui_session_timing_v2';

export const ROLE_SESSION_POLICIES = {
  // Rol de alta sensibilidad (acceso a costos, proveedores, auditoría y stock global)
  admin: {
    idleTimeoutMs: 60 * 60 * 1000,      // 60 minutos de inactividad
    maxSessionMs: 8 * 60 * 60 * 1000,   // 8 horas de duración máxima absoluta (1 jornada)
    warningBeforeMs: 60 * 1000          // Aviso 60 segundos antes del cierre
  },
  // Roles operativos en planta, logística y sucursales
  heladero: {
    idleTimeoutMs: 60 * 60 * 1000,      // 60 minutos de inactividad
    maxSessionMs: 12 * 60 * 60 * 1000,  // 12 horas de duración máxima absoluta (1 turno)
    warningBeforeMs: 60 * 1000
  },
  pastelero: {
    idleTimeoutMs: 60 * 60 * 1000,
    maxSessionMs: 12 * 60 * 60 * 1000,
    warningBeforeMs: 60 * 1000
  },
  transportista: {
    idleTimeoutMs: 60 * 60 * 1000,
    maxSessionMs: 12 * 60 * 60 * 1000,
    warningBeforeMs: 60 * 1000
  },
  sucursal: {
    idleTimeoutMs: 60 * 60 * 1000,
    maxSessionMs: 12 * 60 * 60 * 1000,
    warningBeforeMs: 60 * 1000
  }
};

const DEFAULT_POLICY = ROLE_SESSION_POLICIES.sucursal;

/**
 * Obtiene la política aplicable al rol actual.
 * Soporta overrides seguros por URL (?test_idle_sec=15&test_max_sec=20)
 * que afectan únicamente a la pestaña donde se realiza la prueba.
 */
export function getSessionPolicyForRole(rol, searchString = '') {
  const base = ROLE_SESSION_POLICIES[rol] || DEFAULT_POLICY;
  let idleTimeoutMs = base.idleTimeoutMs;
  let maxSessionMs = base.maxSessionMs;
  let warningBeforeMs = base.warningBeforeMs;
  let isTestOverride = false;

  if (searchString) {
    try {
      const params = new URLSearchParams(searchString);
      const testIdleSec = Number(params.get('test_idle_sec'));
      const testMaxSec = Number(params.get('test_max_sec'));

      if (Number.isFinite(testIdleSec) && testIdleSec >= 5 && testIdleSec <= 3600) {
        idleTimeoutMs = testIdleSec * 1000;
        warningBeforeMs = Math.min(5000, Math.max(2000, Math.floor(idleTimeoutMs / 3)));
        isTestOverride = true;
      }

      if (Number.isFinite(testMaxSec) && testMaxSec >= 5 && testMaxSec <= 3600) {
        maxSessionMs = testMaxSec * 1000;
        warningBeforeMs = Math.min(warningBeforeMs, Math.max(2000, Math.floor(maxSessionMs / 3)));
        isTestOverride = true;
      }
    } catch {
      // Ignorar errores de parseo de query string
    }
  }

  return {
    rol: rol || 'sucursal',
    idleTimeoutMs,
    maxSessionMs,
    warningBeforeMs,
    isTestOverride
  };
}

/**
 * Evalúa de forma pura el estado de la sesión (ACTIVE, WARNING, EXPIRED_IDLE, EXPIRED_ABSOLUTE).
 */
export function evaluateSessionState({ loginAt, lastActivityAt, now = Date.now(), policy }) {
  const activePolicy = policy || DEFAULT_POLICY;
  const safeLoginAt = Number(loginAt) || now;
  const safeLastActivityAt = Number(lastActivityAt) || now;

  const elapsedTotalMs = Math.max(0, now - safeLoginAt);
  const elapsedIdleMs = Math.max(0, now - safeLastActivityAt);

  const remainingAbsoluteMs = Math.max(0, activePolicy.maxSessionMs - elapsedTotalMs);
  const remainingIdleMs = Math.max(0, activePolicy.idleTimeoutMs - elapsedIdleMs);

  if (elapsedTotalMs >= activePolicy.maxSessionMs) {
    return {
      status: 'EXPIRED_ABSOLUTE',
      reason: 'max_lifetime',
      message: 'Tu sesión ha alcanzado el tiempo máximo permitido por turno. Por seguridad, vuelve a iniciar sesión.',
      remainingIdleMs: 0,
      remainingAbsoluteMs: 0,
      remainingSeconds: 0
    };
  }

  if (elapsedIdleMs >= activePolicy.idleTimeoutMs) {
    return {
      status: 'EXPIRED_IDLE',
      reason: 'inactivity',
      message: 'Tu sesión se cerró automáticamente por inactividad para proteger la cuenta.',
      remainingIdleMs: 0,
      remainingAbsoluteMs,
      remainingSeconds: 0
    };
  }

  const effectiveRemainingMs = Math.min(remainingIdleMs, remainingAbsoluteMs);
  if (effectiveRemainingMs <= activePolicy.warningBeforeMs) {
    const warningType = remainingIdleMs <= remainingAbsoluteMs ? 'inactivity' : 'max_lifetime';
    return {
      status: 'WARNING',
      warningType,
      remainingIdleMs,
      remainingAbsoluteMs,
      remainingSeconds: Math.max(1, Math.ceil(effectiveRemainingMs / 1000))
    };
  }

  return {
    status: 'ACTIVE',
    remainingIdleMs,
    remainingAbsoluteMs,
    remainingSeconds: Math.ceil(effectiveRemainingMs / 1000)
  };
}

