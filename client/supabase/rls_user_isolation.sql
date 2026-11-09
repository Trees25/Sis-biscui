-- =========================================================================
-- POLÍTICAS RLS DE AISLAMIENTO POR USUARIO Y SUCURSAL (SUPABASE / POSTGRESQL)
-- Archivo: supabase/rls_user_isolation.sql
-- Propósito:
--   Reemplazar la política permisiva "Control total para autenticados" (USING true)
--   por políticas de mínimo privilegio donde cada usuario solo puede acceder y
--   modificar sus propios registros o los de su sucursal asignada.
-- =========================================================================

-- 1. FUNCIONES HELPER DE IDENTIDAD (SECURITY DEFINER + STABLE)
-- Evitan la recursión infinita al consultar public.usuarios dentro de las políticas RLS
-- y aprovechan el caché por sentencia de PostgreSQL.

CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sucursal_id()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sucursal_id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 2. PROTECCIÓN DE COLUMNA SENSIBLE EN public.usuarios
-- Impide que cualquier consulta desde la API (PostgREST) pueda leer la columna legacy "password"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'password'
  ) THEN
    REVOKE SELECT (password) ON public.usuarios FROM anon, authenticated;
  END IF;
END $$;

-- 3. ASEGURAR QUE RLS ESTÉ HABILITADO EN TODAS LAS TABLAS CON DATOS DE USUARIOS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumo_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lote_pesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_produccion_detalles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_movimientos') THEN
    EXECUTE 'ALTER TABLE public.historial_movimientos ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 4. ELIMINAR POLÍTICAS PERMISIVAS ANTERIORES ("Control total para autenticados")
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'usuarios', 'sucursales', 'proveedores', 'productos', 'maquinas',
    'stock_sucursales', 'lotes_produccion', 'lote_pesos', 'consumo_diario',
    'mantenimientos', 'pedidos', 'pedido_detalles', 'items_pendientes',
    'discrepancias', 'ordenes_produccion', 'orden_produccion_detalles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Control total para autenticados" ON public.%I', t);
  END LOOP;
END $$;

-- =========================================================================
-- 5. POLÍTICAS RLS POR TABLA (AISLAMIENTO POR USUARIO Y SUCURSAL)
-- =========================================================================

-- 5.1 TABLA: public.usuarios
-- Cada persona solo puede ver su propio perfil (auth_id = auth.uid()).
-- Solo el rol 'admin' puede ver o administrar todos los perfiles.
DROP POLICY IF EXISTS "Lectura de usuarios para autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Solo admin modifica usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "rls_usuarios_select_own_or_admin" ON public.usuarios;
DROP POLICY IF EXISTS "rls_usuarios_admin_write" ON public.usuarios;

CREATE POLICY "rls_usuarios_select_own_or_admin"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    auth_id = (SELECT auth.uid())
    OR public.get_my_role() = 'admin'
  );

CREATE POLICY "rls_usuarios_admin_write"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- 5.2 CATÁLOGOS MAESTROS (sucursales, productos, proveedores, maquinas, mantenimientos)
-- Lectura para autenticados; escritura exclusiva para administradores (o creación controlada de insumos).
DROP POLICY IF EXISTS "rls_sucursales_select" ON public.sucursales;
DROP POLICY IF EXISTS "rls_sucursales_admin_write" ON public.sucursales;
CREATE POLICY "rls_sucursales_select" ON public.sucursales FOR SELECT TO authenticated USING (true);
CREATE POLICY "rls_sucursales_admin_write" ON public.sucursales FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "rls_productos_select" ON public.productos;
DROP POLICY IF EXISTS "rls_productos_insert" ON public.productos;
DROP POLICY IF EXISTS "rls_productos_admin_update_delete" ON public.productos;
CREATE POLICY "rls_productos_select" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "rls_productos_insert" ON public.productos FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'sucursal' AND categoria = 'otros')
  );
CREATE POLICY "rls_productos_admin_update_delete" ON public.productos FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "rls_productos_admin_delete" ON public.productos;
CREATE POLICY "rls_productos_admin_delete" ON public.productos FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "rls_proveedores_select" ON public.proveedores;
DROP POLICY IF EXISTS "rls_proveedores_admin_write" ON public.proveedores;
CREATE POLICY "rls_proveedores_select" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "rls_proveedores_admin_write" ON public.proveedores FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "rls_maquinas_select" ON public.maquinas;
DROP POLICY IF EXISTS "rls_maquinas_admin_write" ON public.maquinas;
CREATE POLICY "rls_maquinas_select" ON public.maquinas FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR sucursal_id = public.get_my_sucursal_id());
CREATE POLICY "rls_maquinas_admin_write" ON public.maquinas FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "rls_mantenimientos_select" ON public.mantenimientos;
DROP POLICY IF EXISTS "rls_mantenimientos_admin_write" ON public.mantenimientos;
CREATE POLICY "rls_mantenimientos_select" ON public.mantenimientos FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');
CREATE POLICY "rls_mantenimientos_admin_write" ON public.mantenimientos FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- 5.3 TABLA: public.stock_sucursales
-- Una sucursal solo puede ver su propio stock (y consultar disponibilidad en Fábrica id=1),
-- pero JAMÁS puede ver ni modificar el stock de otra sucursal.
DROP POLICY IF EXISTS "rls_stock_select_own_branch" ON public.stock_sucursales;
DROP POLICY IF EXISTS "rls_stock_insert_own_branch" ON public.stock_sucursales;
DROP POLICY IF EXISTS "rls_stock_update_own_branch" ON public.stock_sucursales;
DROP POLICY IF EXISTS "rls_stock_delete_admin" ON public.stock_sucursales;

CREATE POLICY "rls_stock_select_own_branch"
  ON public.stock_sucursales
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
    OR sucursal_id = 1
  );

CREATE POLICY "rls_stock_insert_own_branch"
  ON public.stock_sucursales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
    OR (public.get_my_role() IN ('heladero', 'pastelero', 'transportista') AND sucursal_id = 1)
  );

CREATE POLICY "rls_stock_update_own_branch"
  ON public.stock_sucursales
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
    OR (public.get_my_role() IN ('heladero', 'pastelero', 'transportista') AND sucursal_id = 1)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
    OR (public.get_my_role() IN ('heladero', 'pastelero', 'transportista') AND sucursal_id = 1)
  );

CREATE POLICY "rls_stock_delete_admin"
  ON public.stock_sucursales
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- 5.4 TABLA: public.consumo_diario
-- Cada usuario de sucursal solo puede ver e insertar consumos de su propia sucursal y a su propio nombre.
DROP POLICY IF EXISTS "rls_consumo_select_own" ON public.consumo_diario;
DROP POLICY IF EXISTS "rls_consumo_insert_own" ON public.consumo_diario;
DROP POLICY IF EXISTS "rls_consumo_admin_modify" ON public.consumo_diario;

CREATE POLICY "rls_consumo_select_own"
  ON public.consumo_diario
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
  );

CREATE POLICY "rls_consumo_insert_own"
  ON public.consumo_diario
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      sucursal_id = public.get_my_sucursal_id()
      AND creado_por = public.get_my_user_id()
    )
  );

CREATE POLICY "rls_consumo_admin_modify"
  ON public.consumo_diario
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- 5.5 TABLA: public.items_pendientes
-- Cada sucursal solo ve y gestiona sus propios ítems pendientes.
DROP POLICY IF EXISTS "rls_items_pendientes_own_branch" ON public.items_pendientes;
CREATE POLICY "rls_items_pendientes_own_branch"
  ON public.items_pendientes
  FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR sucursal_id = public.get_my_sucursal_id()
  );

-- 5.6 TABLAS: public.pedidos y public.pedido_detalles
-- Una sucursal solo puede ver, crear o recibir pedidos cuya sucursal_destino_id sea la suya.
DROP POLICY IF EXISTS "rls_pedidos_select_own" ON public.pedidos;
DROP POLICY IF EXISTS "rls_pedidos_insert_own" ON public.pedidos;
DROP POLICY IF EXISTS "rls_pedidos_update_own" ON public.pedidos;
DROP POLICY IF EXISTS "rls_pedidos_delete_admin" ON public.pedidos;

CREATE POLICY "rls_pedidos_select_own"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
    OR sucursal_destino_id = public.get_my_sucursal_id()
    OR creado_por_id = public.get_my_user_id()
  );

CREATE POLICY "rls_pedidos_insert_own"
  ON public.pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      sucursal_destino_id = public.get_my_sucursal_id()
      AND creado_por_id = public.get_my_user_id()
    )
  );

CREATE POLICY "rls_pedidos_update_own"
  ON public.pedidos
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
    OR sucursal_destino_id = public.get_my_sucursal_id()
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
    OR sucursal_destino_id = public.get_my_sucursal_id()
  );

CREATE POLICY "rls_pedidos_delete_admin"
  ON public.pedidos
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Detalles de pedidos: vinculados a la visibilidad del pedido padre
DROP POLICY IF EXISTS "rls_pedido_detalles_select" ON public.pedido_detalles;
DROP POLICY IF EXISTS "rls_pedido_detalles_insert" ON public.pedido_detalles;
DROP POLICY IF EXISTS "rls_pedido_detalles_update" ON public.pedido_detalles;
DROP POLICY IF EXISTS "rls_pedido_detalles_delete" ON public.pedido_detalles;

CREATE POLICY "rls_pedido_detalles_select"
  ON public.pedido_detalles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_detalles.pedido_id
        AND (
          public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
          OR p.sucursal_destino_id = public.get_my_sucursal_id()
          OR p.creado_por_id = public.get_my_user_id()
        )
    )
  );

CREATE POLICY "rls_pedido_detalles_insert"
  ON public.pedido_detalles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_detalles.pedido_id
        AND (
          public.get_my_role() = 'admin'
          OR (p.sucursal_destino_id = public.get_my_sucursal_id() AND p.creado_por_id = public.get_my_user_id())
        )
    )
  );

CREATE POLICY "rls_pedido_detalles_update"
  ON public.pedido_detalles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_detalles.pedido_id
        AND (
          public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
          OR p.sucursal_destino_id = public.get_my_sucursal_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_detalles.pedido_id
        AND (
          public.get_my_role() IN ('admin', 'transportista', 'heladero', 'pastelero')
          OR p.sucursal_destino_id = public.get_my_sucursal_id()
        )
    )
  );

CREATE POLICY "rls_pedido_detalles_delete"
  ON public.pedido_detalles
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_detalles.pedido_id
        AND p.sucursal_destino_id = public.get_my_sucursal_id()
        AND p.estado = 'solicitado'
    )
  );

-- 5.7 TABLA: public.discrepancias
DROP POLICY IF EXISTS "rls_discrepancias_select" ON public.discrepancias;
DROP POLICY IF EXISTS "rls_discrepancias_insert" ON public.discrepancias;
DROP POLICY IF EXISTS "rls_discrepancias_delete_admin" ON public.discrepancias;

CREATE POLICY "rls_discrepancias_select"
  ON public.discrepancias
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'transportista')
    OR EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = discrepancias.pedido_id
        AND p.sucursal_destino_id = public.get_my_sucursal_id()
    )
  );

CREATE POLICY "rls_discrepancias_insert"
  ON public.discrepancias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'transportista')
    OR EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = discrepancias.pedido_id
        AND p.sucursal_destino_id = public.get_my_sucursal_id()
    )
  );

CREATE POLICY "rls_discrepancias_delete_admin"
  ON public.discrepancias
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- 5.8 TABLAS: public.lotes_produccion y public.lote_pesos
-- Solo personal de fábrica/logística/admin ve los lotes; cada operario solo puede editar/borrar los lotes que él mismo creó (o admin).
DROP POLICY IF EXISTS "rls_lotes_select" ON public.lotes_produccion;
DROP POLICY IF EXISTS "rls_lotes_insert" ON public.lotes_produccion;
DROP POLICY IF EXISTS "rls_lotes_update_own_or_admin" ON public.lotes_produccion;
DROP POLICY IF EXISTS "rls_lotes_delete_own_or_admin" ON public.lotes_produccion;

CREATE POLICY "rls_lotes_select"
  ON public.lotes_produccion
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'heladero', 'pastelero', 'transportista')
    OR creado_por = public.get_my_user_id()
  );

CREATE POLICY "rls_lotes_insert"
  ON public.lotes_produccion
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('heladero', 'pastelero', 'transportista')
      AND creado_por = public.get_my_user_id()
    )
  );

CREATE POLICY "rls_lotes_update_own_or_admin"
  ON public.lotes_produccion
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR creado_por = public.get_my_user_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR creado_por = public.get_my_user_id()
  );

CREATE POLICY "rls_lotes_delete_own_or_admin"
  ON public.lotes_produccion
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR creado_por = public.get_my_user_id()
  );

DROP POLICY IF EXISTS "rls_lote_pesos_all" ON public.lote_pesos;
CREATE POLICY "rls_lote_pesos_all"
  ON public.lote_pesos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lotes_produccion lp
      WHERE lp.id = lote_pesos.lote_id
        AND (
          public.get_my_role() = 'admin'
          OR lp.creado_por = public.get_my_user_id()
          OR public.get_my_role() IN ('heladero', 'pastelero', 'transportista')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lotes_produccion lp
      WHERE lp.id = lote_pesos.lote_id
        AND (
          public.get_my_role() = 'admin'
          OR lp.creado_por = public.get_my_user_id()
        )
    )
  );

-- 5.9 TABLAS: public.ordenes_produccion y public.orden_produccion_detalles
DROP POLICY IF EXISTS "rls_ordenes_prod_select" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "rls_ordenes_prod_insert_admin" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "rls_ordenes_prod_update" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "rls_ordenes_prod_delete_admin" ON public.ordenes_produccion;

CREATE POLICY "rls_ordenes_prod_select"
  ON public.ordenes_produccion
  FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'heladero', 'pastelero'));

CREATE POLICY "rls_ordenes_prod_insert_admin"
  ON public.ordenes_produccion
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "rls_ordenes_prod_update"
  ON public.ordenes_produccion
  FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'heladero', 'pastelero'))
  WITH CHECK (public.get_my_role() IN ('admin', 'heladero', 'pastelero'));

CREATE POLICY "rls_ordenes_prod_delete_admin"
  ON public.ordenes_produccion
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "rls_orden_prod_detalles_all" ON public.orden_produccion_detalles;
CREATE POLICY "rls_orden_prod_detalles_all"
  ON public.orden_produccion_detalles
  FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'heladero', 'pastelero'))
  WITH CHECK (public.get_my_role() IN ('admin', 'heladero', 'pastelero'));

-- 5.10 TABLA: public.historial_movimientos (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_movimientos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Control total para autenticados" ON public.historial_movimientos';
    EXECUTE 'DROP POLICY IF EXISTS "rls_historial_select_own" ON public.historial_movimientos';
    EXECUTE 'DROP POLICY IF EXISTS "rls_historial_insert_own" ON public.historial_movimientos';

    EXECUTE $pol$
      CREATE POLICY "rls_historial_select_own"
        ON public.historial_movimientos
        FOR SELECT
        TO authenticated
        USING (
          public.get_my_role() = 'admin'
          OR sucursal_id = public.get_my_sucursal_id()
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "rls_historial_insert_own"
        ON public.historial_movimientos
        FOR INSERT
        TO authenticated
        WITH CHECK (
          public.get_my_role() = 'admin'
          OR (
            sucursal_id = public.get_my_sucursal_id()
            AND (usuario_id IS NULL OR usuario_id = (SELECT auth.uid()))
          )
          OR (
            public.get_my_role() IN ('heladero', 'pastelero', 'transportista')
            AND sucursal_id = 1
          )
        )
    $pol$;
  END IF;
END $$;

-- =========================================================================
-- 6. PROTECCIÓN DE PERTENENCIA EN RPCs (SECURITY DEFINER)
-- =========================================================================
-- Como las funciones RPC usan SECURITY DEFINER, validamos dentro de ellas que
-- el usuario autenticado no pueda suplir el ID de otro usuario ni de otra sucursal.

CREATE OR REPLACE FUNCTION public.registrar_consumo(
    p_sucursal_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_es_evento BOOLEAN,
    p_creado_por INT
) RETURNS VOID AS $$
DECLARE
    v_role TEXT := public.get_my_role();
    v_my_sucursal INT := public.get_my_sucursal_id();
    v_my_user_id INT := public.get_my_user_id();
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
    END IF;

    IF v_role <> 'admin' AND (p_sucursal_id IS DISTINCT FROM v_my_sucursal OR p_creado_por IS DISTINCT FROM v_my_user_id) THEN
        RAISE EXCEPTION 'No tienes permiso para registrar consumos en otra sucursal o a nombre de otro usuario.' USING ERRCODE = '42501';
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100000 THEN
        RAISE EXCEPTION 'La cantidad consumida debe ser mayor a 0 y menor o igual a 100,000.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.consumo_diario (sucursal_id, producto_id, cantidad, creado_por, es_evento)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad, p_creado_por, COALESCE(p_es_evento, FALSE));

    UPDATE public.stock_sucursales
    SET cantidad = GREATEST(0, cantidad - p_cantidad)
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id AND es_evento = COALESCE(p_es_evento, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
