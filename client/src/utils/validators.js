/**
 * Módulo centralizado de Validación y Sanitización de Entradas (Input Security)
 * Protege contra:
 *  - XSS (Cross-Site Scripting) y etiquetas HTML maliciosas
 *  - Inyección de Fórmulas en CSV / Excel (CSV Macro / Formula Injection)
 *  - Caracteres de control invisibles / Null bytes
 *  - Tipos numéricos inválidos (NaN, Infinity, negativos, desbordamientos)
 *  - Formatos inválidos de Email, CUIT, Teléfono, Fechas ISO y Enumerados
 */

// 1. SANITIZADORES DE TEXTO Y SALIDA (XSS & CSV/EXCEL INJECTION)

/**
 * Limpia una cadena de texto eliminando caracteres de control/null bytes,
 * etiquetas HTML (<script>, <img onerror=...>, etc.) y recortando espacios.
 */
export const sanitizeText = (value, maxLength = 255) => {
  if (value === undefined || value === null) return '';
  const cleaned = String(value)
    // Eliminar null bytes y caracteres de control ASCII (excepto salto de línea y tabulación)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Eliminar etiquetas HTML completas o parciales para prevenir XSS almacenado
    .replace(/<[^>]*>?/gm, '')
    // Reemplazar paréntesis angulares sueltos remanentes
    .replace(/[<>]/g, '')
    .trim();

  return cleaned.slice(0, maxLength);
};

/**
 * Escapa entidades HTML para inserción segura en reportes HTML/Excel (.xls)
 */
export const escapeHtml = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Previene Inyección de Fórmulas en Excel/CSV (Formula Injection: =, +, -, @, Tab, CR)
 * y escapa HTML si se exporta a tabla .xls
 */
export const sanitizeSpreadsheetCell = (value, isHtmlTable = true) => {
  if (value === undefined || value === null) return '';
  let str = String(value).trim();
  // Si empieza con un operador de fórmula (=, +, -, @) y no es un número negativo válido,
  // anteponer comilla simple para neutralizar ejecución de macros en Excel.
  if (/^[=+\-@]/.test(str) && !/^-\d+(\.\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  return isHtmlTable ? escapeHtml(str) : str.replace(/[\r\n,;]+/g, ' ');
};

// 2. VALIDADORES POR TIPO DE DATO

/**
 * Valida un texto obligatorio o opcional con límites de longitud.
 */
export const validateString = (value, fieldName, { required = true, minLength = 1, maxLength = 255 } = {}) => {
  const sanitized = sanitizeText(value, maxLength);
  if (!sanitized) {
    if (required) {
      throw new Error(`El campo "${fieldName}" es obligatorio.`);
    }
    return null;
  }
  if (sanitized.length < minLength) {
    throw new Error(`El campo "${fieldName}" debe tener al menos ${minLength} caracteres.`);
  }
  return sanitized;
};

/**
 * Valida un identificador entero positivo (ID de base de datos / clave foránea).
 */
export const validatePositiveId = (value, fieldName = 'ID', { required = true } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`Debes seleccionar un ${fieldName} válido.`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
    throw new Error(`El campo "${fieldName}" contiene un identificador inválido.`);
  }
  return parsed;
};

/**
 * Valida números enteros o decimales dentro de un rango permitido.
 */
export const validateNumber = (
  value,
  fieldName,
  { min = 0, max = 100000, allowDecimals = true, required = true } = {}
) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`El campo "${fieldName}" es obligatorio.`);
    return null;
  }
  const normalizedStr = typeof value === 'string' ? value.trim().replace(',', '.') : String(value);
  if (!/^-?\d+(\.\d+)?$/.test(normalizedStr)) {
    throw new Error(`El campo "${fieldName}" debe ser un número válido.`);
  }
  const num = Number(normalizedStr);
  if (!Number.isFinite(num)) {
    throw new Error(`El campo "${fieldName}" no es un número finito válido.`);
  }
  if (!allowDecimals && !Number.isInteger(num)) {
    throw new Error(`El campo "${fieldName}" debe ser un número entero sin decimales.`);
  }
  if (num < min) {
    throw new Error(`El campo "${fieldName}" debe ser mayor o igual a ${min}.`);
  }
  if (num > max) {
    throw new Error(`El campo "${fieldName}" no puede superar ${max}.`);
  }
  return allowDecimals ? Number(num.toFixed(3)) : Math.trunc(num);
};

/**
 * Valida una fecha en formato ISO (YYYY-MM-DD) dentro de un rango razonable.
 */
export const validateDateISO = (value, fieldName = 'Fecha', { required = true } = {}) => {
  if (!value) {
    if (required) throw new Error(`El campo "${fieldName}" es obligatorio.`);
    return null;
  }
  const str = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(`El campo "${fieldName}" debe tener el formato AAAA-MM-DD.`);
  }
  const [year, month, day] = str.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() + 1 !== month ||
    dateObj.getUTCDate() !== day ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(`El campo "${fieldName}" contiene una fecha inexistente o fuera de rango.`);
  }
  return str;
};

/**
 * Valida dirección de correo electrónico.
 */
export const validateEmail = (value, { required = false } = {}) => {
  const sanitized = sanitizeText(value, 120).toLowerCase();
  if (!sanitized) {
    if (required) throw new Error('El correo electrónico es obligatorio.');
    return null;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('El formato del correo electrónico no es válido.');
  }
  return sanitized;
};

/**
 * Valida nombre de usuario o email en el formulario de Login.
 * Bloquea caracteres de inyección SQL/HTML como ', ", ;, --, <, >
 */
export const validateLoginIdentifier = (value) => {
  const sanitized = sanitizeText(value, 120);
  if (!sanitized) {
    throw new Error('Por favor, ingresa tu usuario o correo electrónico.');
  }
  // Permitir letras (incluyendo acentos/ñ), números, espacios simples, puntos, guiones, guiones bajos y @
  const safeUserRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._@\- ]{2,120}$/;
  if (!safeUserRegex.test(sanitized)) {
    throw new Error('El usuario o email contiene caracteres no permitidos.');
  }
  return sanitized;
};

/**
 * Valida CUIT argentino (11 dígitos con o sin guiones: XX-XXXXXXXX-X).
 */
export const validateCUIT = (value, { required = false } = {}) => {
  const sanitized = sanitizeText(value, 20);
  if (!sanitized) {
    if (required) throw new Error('El CUIT es obligatorio.');
    return null;
  }
  if (!/^(\d{2}-\d{8}-\d{1}|\d{11})$/.test(sanitized)) {
    throw new Error('El CUIT debe contener 11 dígitos (ej. 30-12345678-9 o 30123456789).');
  }
  return sanitized;
};

/**
 * Valida número telefónico (solo dígitos, espacios, +, -, paréntesis).
 */
export const validatePhone = (value, { required = false } = {}) => {
  const sanitized = sanitizeText(value, 30);
  if (!sanitized) {
    if (required) throw new Error('El teléfono es obligatorio.');
    return null;
  }
  if (!/^[0-9+\-\s()]{6,25}$/.test(sanitized)) {
    throw new Error('El teléfono contiene caracteres inválidos (usa solo números, +, - o espacios).');
  }
  return sanitized;
};

/**
 * Valida que un valor pertenezca a una lista blanca (enum).
 */
export const validateEnum = (value, allowedValues, fieldName) => {
  const sanitized = sanitizeText(value, 80);
  if (!allowedValues.includes(sanitized)) {
    throw new Error(`El valor seleccionado para "${fieldName}" no es válido.`);
  }
  return sanitized;
};

// Listas blancas oficiales del dominio Biscui
export const ALLOWED_CATEGORIES = [
  'helados',
  'pasteleria_helada',
  'pasteleria',
  'sembrados',
  'termicos',
  'sin_tacc',
  'otros'
];

export const ALLOWED_UNITS = ['unidad', 'peso'];

export const ALLOWED_MACHINE_TYPES = [
  'licuadora_horno_batidora_micro',
  'maquina_helado',
  'frio_abatidor_heladera_camara',
  'aire_acondicionado',
  'otro'
];

export const ALLOWED_MACHINE_STATES = ['activo', 'en_reparacion', 'de_baja'];

export const ALLOWED_MAINTENANCE_TYPES = [
  'limpieza_circuito',
  'limpieza_motor',
  'limpieza_filtros',
  'revision_tecnica',
  'otro'
];

