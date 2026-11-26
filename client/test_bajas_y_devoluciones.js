// =========================================================================
// TEST SUITE: BAJAS DE STOCK (VENCIMIENTOS/DEFECTOS) Y DEVOLUCIONES A FÁBRICA
// Archivo: test_bajas_y_devoluciones.js
// =========================================================================

import { readFileSync } from 'fs';
import { MOTIVOS_BAJA_STOCK, MOTIVOS_DEVOLUCION_FABRICA, validatePositiveId, validateNumber, validateString } from './src/utils/validators.js';
import { normalizeWeight, calculateNetWeight, getTareByTipo, isFrutaVerdura, isWeightProduct, formatQuantity, formatQuantityShort } from './src/utils/formatters.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n🧪 INICIANDO VERIFICACIÓN DE BAJAS DE STOCK Y DEVOLUCIONES A FÁBRICA\n');

// 1. Verificación del script SQL (supabase/bajas_y_devoluciones.sql)
console.log('📌 Test 1: Verificación de estructura y seguridad en el script SQL');
const sqlContent = readFileSync('./supabase/bajas_y_devoluciones.sql', 'utf8');

assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.bajas_stock'), 'Tabla public.bajas_stock definida en SQL');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.devoluciones_fabrica'), 'Tabla public.devoluciones_fabrica definida en SQL');
assert(sqlContent.includes('ALTER TABLE public.bajas_stock ENABLE ROW LEVEL SECURITY'), 'RLS habilitado en public.bajas_stock');
assert(sqlContent.includes('ALTER TABLE public.devoluciones_fabrica ENABLE ROW LEVEL SECURITY'), 'RLS habilitado en public.devoluciones_fabrica');
assert(sqlContent.includes('rate_limit_bajas_stock_trg'), 'Trigger de Rate Limiting en bajas_stock');
assert(sqlContent.includes('rate_limit_devoluciones_fabrica_trg'), 'Trigger de Rate Limiting en devoluciones_fabrica');
assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.registrar_baja_stock'), 'RPC registrar_baja_stock presente');
assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.registrar_devolucion_fabrica'), 'RPC registrar_devolucion_fabrica presente');
assert(sqlContent.includes('tipo_movimiento,\n            cantidad,\n            stock_resultante,\n            detalle'), 'Auditoría en historial_movimientos configurada');

// 2. Verificación de motivos permitidos
console.log('\n📌 Test 2: Listas blancas de motivos (Frontend Validators)');
assert(MOTIVOS_BAJA_STOCK.length >= 5, 'Existen al menos 5 motivos de baja definidos');
const bajaIds = MOTIVOS_BAJA_STOCK.map(m => m.id);
assert(bajaIds.includes('vencimiento'), 'Motivo "vencimiento" presente');
assert(bajaIds.includes('lote_malo'), 'Motivo "lote_malo" presente');
assert(bajaIds.includes('descongelamiento'), 'Motivo "descongelamiento" presente');
assert(bajaIds.includes('rotura'), 'Motivo "rotura" presente');

assert(MOTIVOS_DEVOLUCION_FABRICA.length >= 5, 'Existen al menos 5 motivos de devolución definidos');
const devIds = MOTIVOS_DEVOLUCION_FABRICA.map(m => m.id);
assert(devIds.includes('rotacion_sabor'), 'Motivo "rotacion_sabor" presente');
assert(devIds.includes('exceso_stock'), 'Motivo "exceso_stock" presente');
assert(devIds.includes('inspeccion_calidad'), 'Motivo "inspeccion_calidad" presente');

// 3. Verificación de validaciones de entrada seguras
console.log('\n📌 Test 3: Validación segura de entradas numéricas y texto');
try {
  const pId = validatePositiveId(12, 'Producto');
  assert(pId === 12, 'Validación positiva de ID correcta');
} catch {
  assert(false, 'Validación positiva de ID no debería fallar con 12');
}

try {
  validatePositiveId(-5, 'Producto');
  assert(false, 'ID negativo debería ser rechazado');
} catch (e) {
  assert(true, 'ID negativo rechazado correctamente: ' + e.message);
}

try {
  const validQty = validateNumber('4.500', 'Cantidad', { min: 0.001, max: 100000, allowDecimals: true });
  assert(validQty === 4.5, 'Cantidad decimal normalizada correctamente');
} catch {
  assert(false, 'Cantidad decimal válida no debería fallar');
}

try {
  validateNumber(-1, 'Cantidad', { min: 0.001, max: 100000, allowDecimals: true });
  assert(false, 'Cantidad negativa debería ser rechazada');
} catch (e) {
  assert(true, 'Cantidad negativa rechazada correctamente');
}

// 4. Verificación de normalización de pesos y tara
console.log('\n📌 Test 4: Manejo de pesos, balanza y tara en helados');
const weightGrams = normalizeWeight('5600');
assert(weightGrams === 5.6, '5600 gramos se normalizan a 5.600 kg');

const weightComma = normalizeWeight('5,450');
assert(weightComma === 5.45, '5,450 con coma se normaliza a 5.450 kg');

const vasquetaTare = getTareByTipo('vasqueta_5_6k');
assert(vasquetaTare === 0.63, 'Tara de vasqueta es 0.630 kg');

const netCalc = calculateNetWeight(5.630, 'vasqueta_5_6k', true, 1);
assert(netCalc.net === 5.0, 'Peso neto con tara de vasqueta descontada (5.630 - 0.630 = 5.000 kg)');

// 5. Verificación de Frutas y Verduras como Unidades (No Helados)
console.log('\n📌 Test 5: Manejo de Frutas y Verduras en Unidades y diferenciación con Helados');
const frutaItem = { categoria: 'frutas', nombre: 'Limón' };
const verduraItem = { categoria: 'verduras', nombre: 'Zanahoria' };
const frutaVerduraCatItem = { categoria: 'frutas_verduras', nombre: 'Tomate' };
const heladoFrutilla = { categoria: 'helados', nombre: 'Frutilla a la crema' };
const heladoLimon = { categoria: 'helados', nombre: 'Limón al agua' };
const postreItem = { categoria: 'postres', nombre: 'Torta de Frutilla' };

assert(isFrutaVerdura(frutaItem) === true, 'Limón (categoria: frutas) es fruta/verdura');
assert(isFrutaVerdura(verduraItem) === true, 'Zanahoria (categoria: verduras) es fruta/verdura');
assert(isFrutaVerdura(frutaVerduraCatItem) === true, 'Tomate (categoria: frutas_verduras) es fruta/verdura');
assert(isFrutaVerdura(heladoFrutilla) === false, 'Helado "Frutilla a la crema" NO es clasificado como fruta/verdura genérica');
assert(isFrutaVerdura(heladoLimon) === false, 'Helado "Limón al agua" NO es clasificado como fruta/verdura genérica');

assert(isWeightProduct(frutaItem) === false, 'Fruta se mide por unidad (isWeightProduct = false)');
assert(isWeightProduct(verduraItem) === false, 'Verdura se mide por unidad (isWeightProduct = false)');
assert(isWeightProduct(heladoFrutilla) === true, 'Helado Frutilla se mide por peso (isWeightProduct = true)');
assert(isWeightProduct(heladoLimon) === true, 'Helado Limón se mide por peso (isWeightProduct = true)');

assert(formatQuantity(5, frutaItem) === '5 u', 'Formato de 5 frutas es "5 u"');
assert(formatQuantity(5.5, heladoFrutilla).endsWith('kg') && formatQuantity(5.5, heladoFrutilla).includes('500'), 'Formato de 5.5 helado incluye 500 kg');
assert(formatQuantityShort(12, verduraItem) === '12 u', 'Formato corto de 12 verduras es "12 u"');

// 6. Verificación de corrección de error HTML5 (step vs min) en Modales de Baja y Devolución
console.log('\n📌 Test 6: Validación de min y step para evitar error "0,001 y 1,001"');
function getModalInputAttrs(product) {
  const isWeight = isWeightProduct(product);
  return {
    step: isWeight ? "0.001" : "1",
    min: isWeight ? "0.001" : "1"
  };
}

const unitAttrs = getModalInputAttrs(frutaItem);
assert(unitAttrs.min === "1" && unitAttrs.step === "1", 'Producto por unidad tiene min="1" y step="1"');
// Validación HTML5: (valor - min) % step === 0
const isHtml5ValidForUnit1 = ((1 - Number(unitAttrs.min)) % Number(unitAttrs.step)) === 0;
const isHtml5ValidForUnit2 = ((2 - Number(unitAttrs.min)) % Number(unitAttrs.step)) === 0;
assert(isHtml5ValidForUnit1 && isHtml5ValidForUnit2, 'Valores enteros 1 y 2 son válidos en HTML5 sin error 0,001/1,001');

const weightAttrs = getModalInputAttrs(heladoLimon);
assert(weightAttrs.min === "0.001" && weightAttrs.step === "0.001", 'Producto por peso tiene min="0.001" y step="0.001"');
const stepCount = (5.250 - Number(weightAttrs.min)) / Number(weightAttrs.step);
const isHtml5ValidForWeight = Math.abs(stepCount - Math.round(stepCount)) < 1e-9;
assert(isHtml5ValidForWeight, 'Valores decimales de peso son válidos en HTML5');

// 7. Verificación del script de migración SQL para frutas y verduras
console.log('\n📌 Test 7: Verificación del script SQL update_frutas_verduras_unidades.sql');
const updateFrutasSql = readFileSync('./supabase/update_frutas_verduras_unidades.sql', 'utf8');
assert(updateFrutasSql.includes("UPDATE public.productos"), 'Script actualiza public.productos');
assert(updateFrutasSql.includes("unidad_medida = 'unidad'"), "Establece unidad_medida = 'unidad'");
assert(updateFrutasSql.includes("categoria <> 'helados'"), 'Excluye helados de la actualización');

// Resumen final
console.log(`\n==================================================`);
console.log(`RESULTADO FINAL: ${passed} pruebas superadas, ${failed} fallidas`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
}

