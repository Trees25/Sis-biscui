-- =========================================================================
-- MÓDULO DE BAJAS DE STOCK (VENCIMIENTOS / DEFECTOS) Y DEVOLUCIONES A FÁBRICA
-- Archivo: supabase/bajas_y_devoluciones.sql
-- Propósito:
--   1. Registrar bajas/descartes de kilos o unidades por vencimiento, lote malo,
--      falla de frío o rotura con su observación correspondiente.
--   2. Registrar devoluciones de helado a fábrica desde sucursales con motivo y
--      observación, descontando de la sucursal y sumando al stock de fábrica.
--   3. Garantizar trazabilidad completa en auditoría (historial_movimientos).
--   4. Aplicar todas las capas de seguridad: RLS, validaciones CHECK y Rate Limiting.
-- =========================================================================

-- 1. TABLA: public.bajas_stock (Mermas, vencimientos y lotes descartados)
CREATE TABLE IF NOT EXISTS public.bajas_stock (
    id BIGSERIAL PRIMARY KEY,
    sucursal_id INT NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    motivo TEXT NOT NULL,
    observaciones TEXT,
    es_evento BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id INT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bajas_stock DROP CONSTRAINT IF EXISTS chk_bajas_stock_valid;
ALTER TABLE public.bajas_stock ADD CONSTRAINT chk_bajas_stock_valid CHECK (
    cantidad > 0 AND cantidad <= 100000
    AND (observaciones IS NULL OR public.is_safe_text(observaciones, 500))
    AND motivo IN ('vencimiento', 'lote_malo', 'descongelamiento', 'rotura', 'otro')
) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_bajas_stock_sucursal_fecha
  ON public.bajas_stock (sucursal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bajas_stock_producto_fecha
  ON public.bajas_stock (producto_id, created_at DESC);

ALTER TABLE public.bajas_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_bajas_stock_select" ON public.bajas_stock;
CREATE POLICY "rls_bajas_stock_select"
  ON public.bajas_stock
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'heladero', 'pastelero', 'transportista')
    OR sucursal_id = public.get_my_sucursal_id()
  );

DROP POLICY IF EXISTS "rls_bajas_stock_insert" ON public.bajas_stock;
CREATE POLICY "rls_bajas_stock_insert"
  ON public.bajas_stock
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'sucursal' AND sucursal_id = public.get_my_sucursal_id())
    OR (public.get_my_role() IN ('heladero', 'pastelero') AND sucursal_id = 1)
  );

GRANT SELECT, INSERT ON public.bajas_stock TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bajas_stock_id_seq TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_enforce_rate_limit') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS rate_limit_bajas_stock_trg ON public.bajas_stock';
    EXECUTE 'CREATE TRIGGER rate_limit_bajas_stock_trg BEFORE INSERT ON public.bajas_stock FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60)';
  END IF;
END $$;


-- 2. TABLA: public.devoluciones_fabrica (Helado y productos devueltos a fábrica)
CREATE TABLE IF NOT EXISTS public.devoluciones_fabrica (
    id BIGSERIAL PRIMARY KEY,
    sucursal_origen_id INT NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    sucursal_destino_id INT NOT NULL DEFAULT 1 REFERENCES public.sucursales(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    motivo TEXT NOT NULL,
    observaciones TEXT,
    es_evento BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id INT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.devoluciones_fabrica DROP CONSTRAINT IF EXISTS chk_devoluciones_fabrica_valid;
ALTER TABLE public.devoluciones_fabrica ADD CONSTRAINT chk_devoluciones_fabrica_valid CHECK (
    cantidad > 0 AND cantidad <= 100000
    AND (observaciones IS NULL OR public.is_safe_text(observaciones, 500))
    AND motivo IN ('rotacion_sabor', 'exceso_stock', 'inspeccion_calidad', 'cambio_mercaderia', 'otro')
    AND sucursal_origen_id <> sucursal_destino_id
) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_devoluciones_origen_fecha
  ON public.devoluciones_fabrica (sucursal_origen_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devoluciones_producto_fecha
  ON public.devoluciones_fabrica (producto_id, created_at DESC);

ALTER TABLE public.devoluciones_fabrica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_devoluciones_fabrica_select" ON public.devoluciones_fabrica;
CREATE POLICY "rls_devoluciones_fabrica_select"
  ON public.devoluciones_fabrica
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'heladero', 'pastelero', 'transportista')
    OR sucursal_origen_id = public.get_my_sucursal_id()
  );

DROP POLICY IF EXISTS "rls_devoluciones_fabrica_insert" ON public.devoluciones_fabrica;
CREATE POLICY "rls_devoluciones_fabrica_insert"
  ON public.devoluciones_fabrica
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'sucursal' AND sucursal_origen_id = public.get_my_sucursal_id())
  );

GRANT SELECT, INSERT ON public.devoluciones_fabrica TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.devoluciones_fabrica_id_seq TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_enforce_rate_limit') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS rate_limit_devoluciones_fabrica_trg ON public.devoluciones_fabrica';
    EXECUTE 'CREATE TRIGGER rate_limit_devoluciones_fabrica_trg BEFORE INSERT ON public.devoluciones_fabrica FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60)';
  END IF;
END $$;


-- 3. RPC: REGISTRAR BAJA DE STOCK (VENCIMIENTOS / DEFECTOS / MERMAS)
CREATE OR REPLACE FUNCTION public.registrar_baja_stock(
    p_sucursal_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_motivo TEXT,
    p_observaciones TEXT,
    p_es_evento BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_role TEXT := public.get_my_role();
    v_my_sucursal INT := public.get_my_sucursal_id();
    v_user_id INT := public.get_my_user_id();
    v_user_nombre TEXT;
    v_stock_actual NUMERIC;
    v_nuevo_stock NUMERIC;
    v_prod_nombre TEXT;
    v_motivo_clean TEXT;
    v_obs_clean TEXT;
BEGIN
    -- Rate limit: máximo 10 bajas por minuto por IP
    PERFORM public.check_rate_limit('form:baja_stock', 10, 60);

    -- Validación de autorización
    IF v_role = 'admin' THEN
        -- Admin tiene permiso global
        NULL;
    ELSIF v_role = 'sucursal' THEN
        IF p_sucursal_id IS DISTINCT FROM v_my_sucursal THEN
            RAISE EXCEPTION 'Acceso denegado: solo puedes dar de baja stock de tu propia sucursal.'
                USING ERRCODE = '42501';
        END IF;
    ELSIF v_role IN ('heladero', 'pastelero') THEN
        IF p_sucursal_id <> 1 THEN
            RAISE EXCEPTION 'Acceso denegado: personal de fábrica solo puede dar de baja stock de fábrica (depósito 1).'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado: tu rol (%) no tiene permisos para dar de baja stock.', v_role
            USING ERRCODE = '42501';
    END IF;

    -- Validación de cantidad
    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100000 THEN
        RAISE EXCEPTION 'Validación fallida: la cantidad a dar de baja (%) debe ser mayor a 0 y menor a 100.000.', p_cantidad
            USING ERRCODE = '22003';
    END IF;

    -- Validación y limpieza de textos
    v_motivo_clean := lower(trim(p_motivo));
    IF v_motivo_clean NOT IN ('vencimiento', 'lote_malo', 'descongelamiento', 'rotura', 'otro') THEN
        v_motivo_clean := 'otro';
    END IF;

    v_obs_clean := trim(regexp_replace(COALESCE(p_observaciones, ''), '<[^>]*>', '', 'g'));
    IF NOT public.is_safe_text(v_obs_clean, 500) THEN
        RAISE EXCEPTION 'Validación fallida: las observaciones contienen caracteres no permitidos.'
            USING ERRCODE = '22023';
    END IF;

    -- Obtener nombre del usuario y producto
    SELECT nombre INTO v_user_nombre FROM public.usuarios WHERE id = v_user_id;
    SELECT nombre INTO v_prod_nombre FROM public.productos WHERE id = p_producto_id;

    -- Comprobar stock disponible en la sucursal
    SELECT cantidad INTO v_stock_actual
    FROM public.stock_sucursales
    WHERE sucursal_id = p_sucursal_id
      AND producto_id = p_producto_id
      AND es_evento = COALESCE(p_es_evento, FALSE);

    IF v_stock_actual IS NULL OR v_stock_actual <= 0 THEN
        RAISE EXCEPTION 'No se puede dar de baja: la sucursal no posee stock registrado para este producto (stock actual: 0).'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para la baja: stock actual disponible es %, y se intentó descartar %.',
            v_stock_actual, p_cantidad
            USING ERRCODE = 'P0001';
    END IF;

    v_nuevo_stock := ROUND((v_stock_actual - p_cantidad)::NUMERIC, 3);

    -- Descontar del stock
    UPDATE public.stock_sucursales
    SET cantidad = v_nuevo_stock
    WHERE sucursal_id = p_sucursal_id
      AND producto_id = p_producto_id
      AND es_evento = COALESCE(p_es_evento, FALSE);

    -- Insertar registro de baja
    INSERT INTO public.bajas_stock (
        sucursal_id,
        producto_id,
        cantidad,
        motivo,
        observaciones,
        es_evento,
        usuario_id,
        usuario_nombre
    ) VALUES (
        p_sucursal_id,
        p_producto_id,
        p_cantidad,
        v_motivo_clean,
        NULLIF(v_obs_clean, ''),
        COALESCE(p_es_evento, FALSE),
        v_user_id,
        COALESCE(v_user_nombre, 'Usuario')
    );

    -- Insertar registro en historial_movimientos para auditoría unificada
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_movimientos') THEN
        INSERT INTO public.historial_movimientos (
            sucursal_id,
            producto_id,
            usuario_id,
            tipo_movimiento,
            cantidad,
            stock_resultante,
            detalle,
            fecha
        ) VALUES (
            p_sucursal_id,
            p_producto_id,
            (SELECT auth.uid()),
            'baja_descarte',
            -p_cantidad,
            v_nuevo_stock,
            'Baja/Descarte (' || v_motivo_clean || '): ' || COALESCE(NULLIF(v_obs_clean, ''), 'Sin observaciones adicionales'),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.registrar_baja_stock(INT, INT, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated;


-- 4. RPC: REGISTRAR DEVOLUCIÓN DE HELADO/PRODUCTO A FÁBRICA
CREATE OR REPLACE FUNCTION public.registrar_devolucion_fabrica(
    p_sucursal_origen_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_motivo TEXT,
    p_observaciones TEXT,
    p_es_evento BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_role TEXT := public.get_my_role();
    v_my_sucursal INT := public.get_my_sucursal_id();
    v_user_id INT := public.get_my_user_id();
    v_user_nombre TEXT;
    v_sucursal_origen_nombre TEXT;
    v_stock_origen NUMERIC;
    v_nuevo_stock_origen NUMERIC;
    v_stock_fabrica NUMERIC;
    v_nuevo_stock_fabrica NUMERIC;
    v_motivo_clean TEXT;
    v_obs_clean TEXT;
BEGIN
    -- Rate limit: máximo 10 devoluciones por minuto por IP
    PERFORM public.check_rate_limit('form:devolucion_fabrica', 10, 60);

    -- Validación de que no sea la misma fábrica
    IF p_sucursal_origen_id = 1 THEN
        RAISE EXCEPTION 'Operación inválida: Fábrica no puede devolverse productos a sí misma.'
            USING ERRCODE = '22023';
    END IF;

    -- Validación de autorización
    IF v_role = 'admin' THEN
        NULL;
    ELSIF v_role = 'sucursal' THEN
        IF p_sucursal_origen_id IS DISTINCT FROM v_my_sucursal THEN
            RAISE EXCEPTION 'Acceso denegado: solo puedes registrar devoluciones desde tu propia sucursal.'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado: tu rol (%) no está autorizado para devolver productos a fábrica.', v_role
            USING ERRCODE = '42501';
    END IF;

    -- Validación de cantidad
    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100000 THEN
        RAISE EXCEPTION 'Validación fallida: la cantidad a devolver (%) debe ser mayor a 0 y menor a 100.000.', p_cantidad
            USING ERRCODE = '22003';
    END IF;

    -- Validación y limpieza de motivos y observaciones
    v_motivo_clean := lower(trim(p_motivo));
    IF v_motivo_clean NOT IN ('rotacion_sabor', 'exceso_stock', 'inspeccion_calidad', 'cambio_mercaderia', 'otro') THEN
        v_motivo_clean := 'otro';
    END IF;

    v_obs_clean := trim(regexp_replace(COALESCE(p_observaciones, ''), '<[^>]*>', '', 'g'));
    IF NOT public.is_safe_text(v_obs_clean, 500) THEN
        RAISE EXCEPTION 'Validación fallida: las observaciones contienen caracteres no permitidos.'
            USING ERRCODE = '22023';
    END IF;

    -- Obtener nombres para auditoría
    SELECT nombre INTO v_user_nombre FROM public.usuarios WHERE id = v_user_id;
    SELECT nombre INTO v_sucursal_origen_nombre FROM public.sucursales WHERE id = p_sucursal_origen_id;

    -- Comprobar stock disponible en la sucursal de origen
    SELECT cantidad INTO v_stock_origen
    FROM public.stock_sucursales
    WHERE sucursal_id = p_sucursal_origen_id
      AND producto_id = p_producto_id
      AND es_evento = COALESCE(p_es_evento, FALSE);

    IF v_stock_origen IS NULL OR v_stock_origen <= 0 THEN
        RAISE EXCEPTION 'No se puede devolver: la sucursal no posee stock registrado para este producto (stock actual: 0).'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_stock_origen < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para la devolución: el stock actual en sucursal es %, y se intentó devolver %.',
            v_stock_origen, p_cantidad
            USING ERRCODE = 'P0001';
    END IF;

    v_nuevo_stock_origen := ROUND((v_stock_origen - p_cantidad)::NUMERIC, 3);

    -- 1. Descontar stock de la sucursal de origen
    UPDATE public.stock_sucursales
    SET cantidad = v_nuevo_stock_origen
    WHERE sucursal_id = p_sucursal_origen_id
      AND producto_id = p_producto_id
      AND es_evento = COALESCE(p_es_evento, FALSE);

    -- 2. Incrementar stock en fábrica (sucursal_id = 1)
    INSERT INTO public.stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
    VALUES (1, p_producto_id, p_cantidad, COALESCE(p_es_evento, FALSE))
    ON CONFLICT (sucursal_id, producto_id, es_evento)
    DO UPDATE SET cantidad = public.stock_sucursales.cantidad + EXCLUDED.cantidad
    RETURNING cantidad INTO v_nuevo_stock_fabrica;

    -- 3. Registrar en tabla de devoluciones
    INSERT INTO public.devoluciones_fabrica (
        sucursal_origen_id,
        sucursal_destino_id,
        producto_id,
        cantidad,
        motivo,
        observaciones,
        es_evento,
        usuario_id,
        usuario_nombre
    ) VALUES (
        p_sucursal_origen_id,
        1,
        p_producto_id,
        p_cantidad,
        v_motivo_clean,
        NULLIF(v_obs_clean, ''),
        COALESCE(p_es_evento, FALSE),
        v_user_id,
        COALESCE(v_user_nombre, 'Usuario')
    );

    -- 4. Registrar en historial_movimientos para auditoría de ambas partes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_movimientos') THEN
        -- Registro para la sucursal que devuelve (egreso)
        INSERT INTO public.historial_movimientos (
            sucursal_id,
            producto_id,
            usuario_id,
            tipo_movimiento,
            cantidad,
            stock_resultante,
            detalle,
            fecha
        ) VALUES (
            p_sucursal_origen_id,
            p_producto_id,
            (SELECT auth.uid()),
            'devolucion_a_fabrica',
            -p_cantidad,
            v_nuevo_stock_origen,
            'Devolución enviada a Fábrica (' || v_motivo_clean || '): ' || COALESCE(NULLIF(v_obs_clean, ''), 'Sin observaciones adicionales'),
            NOW()
        );

        -- Registro para Fábrica que recibe (ingreso)
        INSERT INTO public.historial_movimientos (
            sucursal_id,
            producto_id,
            usuario_id,
            tipo_movimiento,
            cantidad,
            stock_resultante,
            detalle,
            fecha
        ) VALUES (
            1,
            p_producto_id,
            (SELECT auth.uid()),
            'recepcion_devolucion_fabrica',
            p_cantidad,
            v_nuevo_stock_fabrica,
            'Devolución recibida de ' || COALESCE(v_sucursal_origen_nombre, 'Sucursal') || ' (' || v_motivo_clean || '): ' || COALESCE(NULLIF(v_obs_clean, ''), 'Sin observaciones adicionales'),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.registrar_devolucion_fabrica(INT, INT, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 5. RECARGAR ESQUEMA EN POSTGREST
NOTIFY pgrst, 'reload schema';

