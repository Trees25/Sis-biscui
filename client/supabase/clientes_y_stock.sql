-- =========================================================================
-- MÓDULO DE CLIENTES ESPECÍFICOS Y STOCK PROPIO DE PRODUCCIÓN
-- Archivo: supabase/clientes_y_stock.sql
-- Propósito:
--   1. Corregir public.is_safe_text() (evitar error 54000 "null character not permitted").
--   2. Crear tabla public.clientes con las mismas validaciones y seguridad que proveedores.
--   3. Crear tabla public.stock_clientes para gestionar stock propio separado de fábrica/eventos.
--   4. Agregar columna cliente_id a public.lotes_produccion para trazabilidad y análisis de compras.
--   5. Actualizar RPC public.registrar_produccion para soportar destino de stock por cliente.
-- =========================================================================

-- 1. ASEGURAR FUNCIÓN DE SANITIZACIÓN DE TEXTO, RATE LIMITING Y HELPERS DE ROL
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_time 
ON public.rate_limit_logs (ip_address, endpoint, created_at DESC);

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bloquear acceso directo a rate_limit_logs" ON public.rate_limit_logs;
CREATE POLICY "Bloquear acceso directo a rate_limit_logs" 
ON public.rate_limit_logs FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS TEXT AS $$
DECLARE
    v_headers JSON;
    v_ip TEXT;
BEGIN
    BEGIN
        v_headers := current_setting('request.headers', true)::JSON;
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::JSON;
    END;

    v_ip := COALESCE(
        v_headers->>'cf-connecting-ip',
        split_part(v_headers->>'x-forwarded-for', ',', 1),
        v_headers->>'x-real-ip',
        'unknown-ip'
    );

    RETURN trim(v_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_endpoint TEXT,
    p_max_requests INT DEFAULT 10,
    p_window_seconds INT DEFAULT 60
) RETURNS VOID AS $$
DECLARE
    v_ip TEXT;
    v_count INT;
    v_retry_after INT;
    v_oldest_in_window TIMESTAMPTZ;
BEGIN
    v_ip := public.get_client_ip();

    DELETE FROM public.rate_limit_logs
    WHERE created_at < NOW() - INTERVAL '1 hour';

    SELECT COUNT(*), MIN(created_at)
    INTO v_count, v_oldest_in_window
    FROM public.rate_limit_logs
    WHERE ip_address = v_ip
      AND endpoint = p_endpoint
      AND created_at > NOW() - make_interval(secs => p_window_seconds);

    IF v_count >= p_max_requests THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_oldest_in_window + make_interval(secs => p_window_seconds) - NOW())))::INT);
        RAISE EXCEPTION 'Límite de solicitudes excedido (% solicitudes por cada % segundos). Por favor, espera % segundos antes de volver a intentarlo.', 
            p_max_requests, p_window_seconds, v_retry_after
            USING ERRCODE = 'P0001',
                  HINT = 'RATE_LIMIT_EXCEEDED';
    END IF;

    INSERT INTO public.rate_limit_logs (ip_address, endpoint, created_at)
    VALUES (v_ip, p_endpoint, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_enforce_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_limit INT := COALESCE(TG_ARGV[0]::INT, 10);
    v_window INT := COALESCE(TG_ARGV[1]::INT, 60);
BEGIN
    PERFORM public.check_rate_limit('table:' || TG_TABLE_NAME, v_limit, v_window);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_safe_text(val TEXT, max_len INT DEFAULT 255)
RETURNS BOOLEAN AS $$
BEGIN
    IF val IS NULL THEN
        RETURN TRUE;
    END IF;
    RETURN char_length(val) <= max_len
       AND val !~ '[<>]'
       AND val !~ '^[=+@]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Asegurar funciones helper de rol
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 2. TABLA: public.clientes (Mismos campos y validaciones que proveedores)
CREATE TABLE IF NOT EXISTS public.clientes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    direccion TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS chk_clientes_valid;
ALTER TABLE public.clientes ADD CONSTRAINT chk_clientes_valid CHECK (
    char_length(trim(nombre)) >= 2
    AND public.is_safe_text(nombre, 120)
    AND public.is_safe_text(direccion, 200)
    AND (cuit IS NULL OR cuit ~ '^(\d{2}-\d{8}-\d{1}|\d{11})$')
    AND (telefono IS NULL OR telefono ~ '^[0-9+\-\s()]{6,25}$')
    AND (email IS NULL OR email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$')
) NOT VALID;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "rls_clientes_admin_write" ON public.clientes;

-- Lectura para usuarios autenticados (admin, heladero, pastelero necesitan ver clientes al cargar producción)
CREATE POLICY "rls_clientes_select"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (true);

-- Creación, edición y eliminación exclusiva para administradores
CREATE POLICY "rls_clientes_admin_write"
  ON public.clientes
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.clientes_id_seq TO authenticated;

-- Trigger de protección administrativa en clientes
CREATE OR REPLACE FUNCTION public.trg_validate_admin_entities()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := public.get_my_role();
BEGIN
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado en servidor: solo un administrador puede % en la tabla %.',
            TG_OP, TG_TABLE_NAME
            USING ERRCODE = '42501', HINT = 'UNAUTHORIZED_ROLE';
    END IF;

    IF TG_TABLE_NAME = 'mantenimientos' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.costo IS NOT NULL AND (NEW.costo < 0 OR NEW.costo > 100000000) THEN
            RAISE EXCEPTION 'Validación rechazada: el costo/pago de mantenimiento (%) debe estar entre 0 y 100.000.000.',
                NEW.costo
                USING ERRCODE = '22003';
        END IF;
        NEW.descripcion := trim(regexp_replace(NEW.descripcion, '<[^>]*>', '', 'g'));
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_clientes_action_trg ON public.clientes;
CREATE TRIGGER validate_clientes_action_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_admin_entities();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_enforce_rate_limit') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS rate_limit_clientes_trg ON public.clientes';
    EXECUTE 'CREATE TRIGGER rate_limit_clientes_trg BEFORE INSERT OR UPDATE ON public.clientes FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60)';
  END IF;
END $$;

-- 2B. CIFRADO AES-256 (pgcrypto) PARA DATOS SENSIBLES DE CLIENTES (CUIT y Contacto)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cuit_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS datos_contacto_encrypted BYTEA;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_fn_encrypt_proveedor_sensitive') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_encrypt_cliente_sensitive ON public.clientes';
    EXECUTE 'CREATE TRIGGER trg_encrypt_cliente_sensitive BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trg_fn_encrypt_proveedor_sensitive()';
  END IF;
END $$;

-- Revocar lectura directa de columnas cifradas crudas (solo exponer columnas de negocio)
DO $$
DECLARE
  v_safe_cli_cols TEXT;
BEGIN
  REVOKE SELECT ON public.clientes FROM anon, authenticated;

  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_safe_cli_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'clientes'
    AND column_name NOT IN ('cuit_encrypted', 'datos_contacto_encrypted');

  IF v_safe_cli_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.clientes TO authenticated', v_safe_cli_cols);
  END IF;
END $$;

-- 3. TABLA: public.stock_clientes (Stock propio separado del de Fábrica y Eventos)
CREATE TABLE IF NOT EXISTS public.stock_clientes (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cliente_id, producto_id)
);

ALTER TABLE public.stock_clientes DROP CONSTRAINT IF EXISTS chk_stock_clientes_cantidad_valid;
ALTER TABLE public.stock_clientes ADD CONSTRAINT chk_stock_clientes_cantidad_valid CHECK (
    cantidad >= 0 AND cantidad <= 100000
) NOT VALID;

ALTER TABLE public.stock_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_stock_clientes_select" ON public.stock_clientes;
DROP POLICY IF EXISTS "rls_stock_clientes_write" ON public.stock_clientes;
DROP POLICY IF EXISTS "rls_stock_clientes_delete" ON public.stock_clientes;

CREATE POLICY "rls_stock_clientes_select"
  ON public.stock_clientes
  FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'heladero', 'pastelero', 'transportista'));

CREATE POLICY "rls_stock_clientes_write"
  ON public.stock_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'heladero', 'pastelero'));

DROP POLICY IF EXISTS "rls_stock_clientes_update" ON public.stock_clientes;
CREATE POLICY "rls_stock_clientes_update"
  ON public.stock_clientes
  FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'heladero', 'pastelero'))
  WITH CHECK (public.get_my_role() IN ('admin', 'heladero', 'pastelero'));

CREATE POLICY "rls_stock_clientes_delete"
  ON public.stock_clientes
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_clientes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.stock_clientes_id_seq TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_enforce_rate_limit') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS rate_limit_stock_clientes_trg ON public.stock_clientes';
    EXECUTE 'CREATE TRIGGER rate_limit_stock_clientes_trg BEFORE INSERT OR UPDATE ON public.stock_clientes FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60)';
  END IF;
END $$;

-- 4. TRAZABILIDAD EN LOTES DE PRODUCCIÓN (Vínculo con cliente específico)
ALTER TABLE public.lotes_produccion
  ADD COLUMN IF NOT EXISTS cliente_id INT REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_produccion_cliente_id
  ON public.lotes_produccion (cliente_id);

-- 5. ACTUALIZAR RPC public.registrar_produccion PARA SOPORTAR CLIENTES ESPECÍFICOS
-- Eliminamos la firma anterior de 7 parámetros para reemplazarla por la de 8 parámetros (con p_cliente_id DEFAULT NULL)
DROP FUNCTION IF EXISTS public.registrar_produccion(TEXT, INT, NUMERIC, NUMERIC[], TIMESTAMP, INT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.registrar_produccion(
    p_codigo_lote TEXT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_pesos NUMERIC[],
    p_fecha_produccion TIMESTAMP,
    p_creado_por INT,
    p_es_evento BOOLEAN,
    p_cliente_id INT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_role TEXT := public.get_my_role();
    v_lote_id INT;
    v_peso NUMERIC;
BEGIN
    PERFORM public.check_rate_limit('form:registrar_produccion', 10, 60);

    IF v_role NOT IN ('admin', 'heladero', 'pastelero', 'transportista') THEN
        RAISE EXCEPTION 'Acceso denegado: tu rol no está autorizado para registrar producción o ingresos.'
            USING ERRCODE = '42501';
    END IF;

    IF p_producto_id IS NULL OR p_producto_id <= 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: producto_id inválido (%).', p_producto_id
            USING ERRCODE = '22023';
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100000 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: la cantidad producida (%) debe ser mayor a 0 y menor a 100.000.', p_cantidad
            USING ERRCODE = '22003';
    END IF;

    IF p_codigo_lote IS NULL OR NOT public.is_safe_text(p_codigo_lote, 50) THEN
        RAISE EXCEPTION 'Validación en servidor fallida: código de lote inválido.'
            USING ERRCODE = '22023';
    END IF;

    IF p_cliente_id IS NOT NULL AND p_cliente_id <= 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: cliente_id inválido (%).', p_cliente_id
            USING ERRCODE = '22023';
    END IF;

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            IF v_peso IS NULL OR v_peso <= 0 OR v_peso > 500 THEN
                RAISE EXCEPTION 'Validación en servidor fallida: peso unitario inválido (%).', v_peso
                    USING ERRCODE = '22003';
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.lotes_produccion (
        codigo_lote,
        producto_id,
        cantidad,
        fecha_produccion,
        creado_por,
        es_evento,
        cliente_id
    )
    VALUES (
        trim(p_codigo_lote),
        p_producto_id,
        p_cantidad,
        COALESCE(p_fecha_produccion, NOW()),
        p_creado_por,
        CASE WHEN p_cliente_id IS NOT NULL THEN FALSE ELSE COALESCE(p_es_evento, FALSE) END,
        p_cliente_id
    )
    RETURNING id INTO v_lote_id;

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            INSERT INTO public.lote_pesos (lote_id, peso_bruto, peso_neto)
            VALUES (v_lote_id, v_peso, v_peso);
        END LOOP;
    END IF;

    -- Si se indicó un cliente específico, sumar al stock propio del cliente (separado de fábrica y eventos)
    IF p_cliente_id IS NOT NULL THEN
        INSERT INTO public.stock_clientes (cliente_id, producto_id, cantidad, updated_at)
        VALUES (p_cliente_id, p_producto_id, p_cantidad, NOW())
        ON CONFLICT (cliente_id, producto_id)
        DO UPDATE SET
            cantidad = public.stock_clientes.cantidad + EXCLUDED.cantidad,
            updated_at = NOW();
    ELSE
        -- Stock normal de Fábrica (es_evento = false) o Eventos (es_evento = true)
        INSERT INTO public.stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
        VALUES (1, p_producto_id, p_cantidad, COALESCE(p_es_evento, FALSE))
        ON CONFLICT (sucursal_id, producto_id, es_evento)
        DO UPDATE SET cantidad = public.stock_sucursales.cantidad + EXCLUDED.cantidad;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.registrar_produccion(TEXT, INT, NUMERIC, NUMERIC[], TIMESTAMP, INT, BOOLEAN, INT) TO authenticated;

-- Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';
