/**
 * Configuración Centralizada de Orígenes Permitidos (CORS)
 * Archivo: src/utils/corsConfig.js
 *
 * Restringe el acceso únicamente al dominio oficial de producción y a los
 * orígenes locales de desarrollo (Vite dev server y Vite preview).
 */

export const PRODUCTION_ORIGINS = [
  'https://sis-biscui.vercel.app',
  'https://biscui.vercel.app'
];

export const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
];

// Patrón seguro para subdominios oficiales de despliegue del proyecto en Vercel
const SAFE_PROD_PATTERN = /^https:\/\/[a-z0-9-]*(biscui)[a-z0-9-]*\.vercel\.app$/i;

/**
 * Obtiene la lista completa de orígenes permitidos, incluyendo VITE_APP_ORIGIN si está definido.
 */
export function getAllowedOrigins(envOrigin = '') {
  const list = [...PRODUCTION_ORIGINS, ...LOCAL_DEV_ORIGINS];
  const trimmed = String(envOrigin || '').trim().replace(/\/+$/, '');
  if (trimmed && !list.includes(trimmed)) {
    list.unshift(trimmed);
  }
  return list;
}

/**
 * Verifica si un encabezado Origin específico está autorizado por la política CORS.
 * - Si no hay encabezado Origin (peticiones same-origin directas o scripts internos), se permite.
 * - Si Origin es 'null' (ej. iframe sandboxed o archivo local file://), se rechaza.
 * - Solo se aceptan orígenes en la lista blanca explícita o el dominio oficial de producción.
 */
export function isOriginAllowed(origin, envOrigin = '') {
  if (origin === undefined || origin === null || origin === '') {
    return true;
  }

  const normalized = String(origin).trim().replace(/\/+$/, '');
  if (!normalized || normalized.toLowerCase() === 'null') {
    return false;
  }

  const allowedList = getAllowedOrigins(envOrigin);
  if (allowedList.includes(normalized)) {
    return true;
  }

  if (SAFE_PROD_PATTERN.test(normalized)) {
    return true;
  }

  return false;
}

