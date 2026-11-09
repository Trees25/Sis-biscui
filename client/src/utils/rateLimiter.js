import { supabase } from '../supabaseClient';

/**
 * Configuración centralizada de límites de velocidad (Rate Limiting).
 * Punto de partida estándar: 10 solicitudes por minuto (60 segundos) por IP/cliente.
 *
 * Para ajustar los límites:
 * - Modifica `maxRequests` (cantidad máxima de peticiones permitidas en la ventana)
 * - Modifica `windowSeconds` (duración de la ventana en segundos, ej. 60 = 1 minuto)
 * - Si usas el script SQL en Supabase (`supabase/rate_limiting.sql`), estos valores se envían
 *   a la función RPC `check_rate_limit(p_endpoint, p_max_requests, p_window_seconds)`.
 */
export const RATE_LIMIT_CONFIG = {
  login: {
    endpoint: 'auth:login',
    maxRequests: 5,
    windowSeconds: 60,
  },
  forms: {
    endpoint: 'form:submission',
    maxRequests: 30,
    windowSeconds: 60,
  },
  ai: {
    endpoint: 'ai:inference',
    maxRequests: 10,
    windowSeconds: 60,
  },
};

const STORAGE_PREFIX = 'biscui_rl_';

/**
 * Verifica el límite local (fallback en memoria/localStorage por cliente) y devuelve
 * cuántos segundos faltan para liberar la ventana si se superó el límite.
 */
function checkLocalRateLimit(endpoint, maxRequests = 10, windowSeconds = 60) {
  try {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `${STORAGE_PREFIX}${endpoint}`;
    const raw = localStorage.getItem(key);
    const timestamps = raw ? JSON.parse(raw) : [];

    // Filtrar solo las solicitudes dentro de la ventana de tiempo activa
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldest = Math.min(...validTimestamps);
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      const message = `Límite de solicitudes excedido (${maxRequests} por minuto). Por favor, espera ${retryAfterSeconds} segundos antes de volver a intentarlo.`;
      const error = new Error(message);
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.status = 429;
      error.retryAfter = retryAfterSeconds;
      throw error;
    }

    validTimestamps.push(now);
    localStorage.setItem(key, JSON.stringify(validTimestamps));
  } catch (err) {
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      throw err;
    }
    // Si localStorage falla (ej. modo incógnito estricto), continuar hacia la validación backend
  }
}

/**
 * Ejecuta la validación de Rate Limiting por IP en el backend (Supabase RPC `check_rate_limit`)
 * combinada con validación preventiva en cliente.
 *
 * @param {'login' | 'forms' | 'ai' | string} categoryOrEndpoint - Categoría ('login', 'forms', 'ai') o nombre personalizado del endpoint.
 * @param {object} [customLimits] - Opcional: `{ maxRequests, windowSeconds }` para sobrescribir la configuración por defecto.
 */
export async function enforceRateLimit(categoryOrEndpoint, customLimits = {}) {
  const preset = RATE_LIMIT_CONFIG[categoryOrEndpoint] || {
    endpoint: categoryOrEndpoint,
    maxRequests: 10,
    windowSeconds: 60,
  };

  const endpoint = preset.endpoint;
  const maxRequests = customLimits.maxRequests ?? preset.maxRequests;
  const windowSeconds = customLimits.windowSeconds ?? preset.windowSeconds;

  // 1. Verificación rápida en capa cliente
  checkLocalRateLimit(endpoint, maxRequests, windowSeconds);

  // 2. Verificación autoritativa por IP en PostgreSQL / Supabase
  const { error } = await supabase.rpc('check_rate_limit', {
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Si la función RPC aún no fue ejecutada en el SQL Editor de Supabase (código PGRST202 / 42883),
    // mantenemos la protección activa mediante el limitador local sin romper la aplicación.
    const isMissingRpc =
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      (error.message && error.message.includes('check_rate_limit'));

    if (!isMissingRpc) {
      const cleanMessage = error.message?.includes('Límite de solicitudes excedido')
        ? error.message
        : `Límite de solicitudes excedido (${maxRequests} por minuto). Por favor, aguarda unos segundos antes de intentar nuevamente.`;
      const rlError = new Error(cleanMessage);
      rlError.code = 'RATE_LIMIT_EXCEEDED';
      rlError.status = 429;
      throw rlError;
    }
  }
}

/**
 * Wrapper estándar para llamadas a IA / sugerencias inteligentes o Edge Functions
 * protegido automáticamente con el rate limiter de IA.
 */
export async function invokeProtectedAI(fnOrEdgeFunctionName, payload = {}, customLimits = {}) {
  await enforceRateLimit('ai', customLimits);

  if (typeof fnOrEdgeFunctionName === 'function') {
    return await fnOrEdgeFunctionName(payload);
  }

  const { data, error } = await supabase.functions.invoke(fnOrEdgeFunctionName, {
    body: payload,
  });

  if (error) throw error;
  return data;
}

