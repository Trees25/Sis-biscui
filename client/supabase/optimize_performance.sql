-- =========================================================================
-- OPTIMIZACIÓN DE RENDIMIENTO POSTGRESQL Y RLS PARA SUPABASE (SIS-BISCUI)
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- 1. ÍNDICES EN LLAVES FORÁNEAS Y COLUMNAS DE FILTRADO/ORDENAMIENTO FRECUENTE
-- PostgreSQL no indexa automáticamente las columnas REFERENCES (Foreign Keys),
-- lo que provocaba Sequential Scans en cada JOIN de pedidos, lotes y stock.

CREATE INDEX IF NOT EXISTS idx_stock_sucursales_sucursal_evento
  ON public.stock_sucursales (sucursal_id, es_evento);

CREATE INDEX IF NOT EXISTS idx_stock_sucursales_producto
  ON public.stock_sucursales (producto_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_destino_created
  ON public.pedidos (sucursal_destino_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_created
  ON public.pedidos (estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido_id
  ON public.pedido_detalles (pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_detalles_producto_id
  ON public.pedido_detalles (producto_id);

CREATE INDEX IF NOT EXISTS idx_discrepancias_pedido_id
  ON public.discrepancias (pedido_id);

CREATE INDEX IF NOT EXISTS idx_discrepancias_fecha
  ON public.discrepancias (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_lotes_produccion_fecha
  ON public.lotes_produccion (fecha_produccion DESC);

CREATE INDEX IF NOT EXISTS idx_lotes_produccion_producto
  ON public.lotes_produccion (producto_id);

CREATE INDEX IF NOT EXISTS idx_lote_pesos_lote_id
  ON public.lote_pesos (lote_id);

CREATE INDEX IF NOT EXISTS idx_orden_prod_detalles_orden_id
  ON public.orden_produccion_detalles (orden_id);

CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_created
  ON public.ordenes_produccion (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consumo_diario_sucursal_fecha
  ON public.consumo_diario (sucursal_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_items_pendientes_sucursal_evento
  ON public.items_pendientes (sucursal_id, es_evento);

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id
  ON public.usuarios (auth_id);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_maquina_fecha
  ON public.mantenimientos (maquina_id, fecha DESC);

-- Índice para historial_movimientos (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_movimientos') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_historial_movimientos_fecha ON public.historial_movimientos (fecha DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_historial_movimientos_sucursal_fecha ON public.historial_movimientos (sucursal_id, fecha DESC)';
  END IF;
END $$;

-- 2. OPTIMIZACIÓN DE POLÍTICAS RLS Y PROTECCIÓN CONTRA ESCALADA DE PRIVILEGIOS
-- Reemplazar el patrón deprecado auth.role() = 'authenticated' por TO authenticated
-- (evita re-evaluar auth.role() en cada fila) y proteger la tabla usuarios contra modificaciones no autorizadas.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'sucursales', 'proveedores', 'productos', 'maquinas',
    'stock_sucursales', 'lotes_produccion', 'lote_pesos', 'consumo_diario',
    'mantenimientos', 'pedidos', 'pedido_detalles', 'items_pendientes',
    'discrepancias', 'ordenes_produccion', 'orden_produccion_detalles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Control total para autenticados" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Control total para autenticados" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Políticas estrictas para public.usuarios:
-- Lectura permitida a usuarios autenticados (necesario para cruzar nombres en pedidos/auditoría),
-- pero escritura/edición restringida exclusivamente al rol 'admin' para impedir escalada de privilegios.
DROP POLICY IF EXISTS "Control total para autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Lectura de usuarios para autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Solo admin modifica usuarios" ON public.usuarios;

CREATE POLICY "Lectura de usuarios para autenticados"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin modifica usuarios"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.rol = 'admin'
    )
  );


