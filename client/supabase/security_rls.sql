-- =========================================================================
-- SCRIPT DE SEGURIDAD BISCUI (ROW LEVEL SECURITY) - MODO SIMPLIFICADO
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_pesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_produccion_detalles ENABLE ROW LEVEL SECURITY;


-- 2. ELIMINAR CUALQUIER POLÍTICA ANTERIOR
DROP POLICY IF EXISTS "Admin CRUD entidades maestras" ON sucursales;
DROP POLICY IF EXISTS "Admin CRUD productos" ON productos;
DROP POLICY IF EXISTS "Admin CRUD proveedores" ON proveedores;
DROP POLICY IF EXISTS "Admin CRUD maquinas" ON maquinas;
DROP POLICY IF EXISTS "Admin CRUD mantenimientos" ON mantenimientos;
DROP POLICY IF EXISTS "Admin CRUD usuarios" ON usuarios;
DROP POLICY IF EXISTS "Lectura global de entidades maestras" ON sucursales;
DROP POLICY IF EXISTS "Lectura global de productos" ON productos;
DROP POLICY IF EXISTS "Lectura global de proveedores" ON proveedores;
DROP POLICY IF EXISTS "Lectura global de maquinas" ON maquinas;
DROP POLICY IF EXISTS "Lectura global mantenimientos" ON mantenimientos;
DROP POLICY IF EXISTS "CRUD mis usuarios" ON usuarios;
DROP POLICY IF EXISTS "Update mis usuarios" ON usuarios;
DROP POLICY IF EXISTS "CRUD de stock" ON stock_sucursales;
DROP POLICY IF EXISTS "CRUD de pedidos" ON pedidos;
DROP POLICY IF EXISTS "CRUD de detalles de pedidos" ON pedido_detalles;
DROP POLICY IF EXISTS "CRUD items_pendientes" ON items_pendientes;
DROP POLICY IF EXISTS "CRUD lotes_produccion" ON lotes_produccion;
DROP POLICY IF EXISTS "CRUD lote_pesos" ON lote_pesos;
DROP POLICY IF EXISTS "CRUD global de ordenes de produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "CRUD global de orden_detalles" ON orden_produccion_detalles;
DROP POLICY IF EXISTS "CRUD de consumos" ON consumo_diario;
DROP POLICY IF EXISTS "CRUD de discrepancias" ON discrepancias;

-- 3. POLÍTICAS SIMPLIFICADAS: CONTROL TOTAL PARA USUARIOS AUTENTICADOS
-- Esto asegura que solo las personas logueadas en el sistema puedan operar,
-- pero elimina las restricciones internas que causan bloqueos al cruzar datos.

CREATE POLICY "Control total para autenticados" ON sucursales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON usuarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON proveedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON productos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON maquinas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON stock_sucursales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON lotes_produccion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON lote_pesos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON consumo_diario FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON mantenimientos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON pedidos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON pedido_detalles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON items_pendientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON discrepancias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON ordenes_produccion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Control total para autenticados" ON orden_produccion_detalles FOR ALL USING (auth.role() = 'authenticated');

-- 4. ACTUALIZAR VISTAS
ALTER VIEW v_stock_matriz SET (security_invoker = true);
ALTER VIEW v_flujo_pedidos_stats SET (security_invoker = true);
ALTER VIEW v_auditoria_consumo SET (security_invoker = true);
