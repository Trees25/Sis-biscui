-- =========================================================================
-- RATE LIMITING EN POSTGRESQL / SUPABASE (POR IP Y ENDPOINT)
-- Punto de partida: 10 solicitudes por minuto (60 segundos) por IP
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- 1. TABLA DE REGISTRO DE SOLICITUDES (SLIDING WINDOW)
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice compuesto para búsquedas ultra rápidas por IP, endpoint y ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_time 
ON public.rate_limit_logs (ip_address, endpoint, created_at DESC);

-- Habilitar RLS y bloquear acceso directo desde la API pública (solo accesible vía funciones SECURITY DEFINER)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bloquear acceso directo a rate_limit_logs" ON public.rate_limit_logs;
CREATE POLICY "Bloquear acceso directo a rate_limit_logs" 
ON public.rate_limit_logs FOR ALL USING (false);

-- 2. FUNCIÓN AUXILIAR PARA OBTENER LA IP DEL CLIENTE DESDE HEADERS DE POSTGREST / SUPABASE
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

    -- Prioridad de cabeceras estándar en Cloudflare / Supabase / Proxies
    v_ip := COALESCE(
        v_headers->>'cf-connecting-ip',
        split_part(v_headers->>'x-forwarded-for', ',', 1),
        v_headers->>'x-real-ip',
        'unknown-ip'
    );

    RETURN trim(v_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN CENTRAL DE RATE LIMITING
-- Lanza excepción con código P0001 (HTTP 400/429 en cliente) y mensaje claro si se supera el límite
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

    -- Limpieza oportunista de registros antiguos (> 1 hora) para mantener la tabla liviana
    DELETE FROM public.rate_limit_logs
    WHERE created_at < NOW() - INTERVAL '1 hour';

    -- Contar solicitudes de esta IP para este endpoint dentro de la ventana
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

    -- Registrar la solicitud actual
    INSERT INTO public.rate_limit_logs (ip_address, endpoint, created_at)
    VALUES (v_ip, p_endpoint, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--Permitir invocar check_rate_limit desde el cliente o Edge Functions (para endpoints de IA, login, etc.)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO anon, authenticated;

-- =========================================================================
-- 4. PROTECCIÓN EN ENDPOINTS RPC (LOGIN, FORMULARIOS Y OPERACIONES)
-- =========================================================================

-- A) LOGIN: Proteger resolución de usuario/email (10 req / 60s por IP)
CREATE OR REPLACE FUNCTION public.get_user_email(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
    v_email TEXT;
BEGIN
    PERFORM public.check_rate_limit('auth:login', 10, 60);

    SELECT email INTO v_email FROM usuarios WHERE nombre = p_username OR email = p_username LIMIT 1;
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) FORMULARIOS Y RPCs DE NEGOCIO (10 req / 60s por IP como punto de partida)
CREATE OR REPLACE FUNCTION public.registrar_produccion(
    p_codigo_lote TEXT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_pesos NUMERIC[],
    p_fecha_produccion TIMESTAMP,
    p_creado_por INT,
    p_es_evento BOOLEAN
) RETURNS VOID AS $$
DECLARE
    v_lote_id INT;
    v_peso NUMERIC;
BEGIN
    PERFORM public.check_rate_limit('form:registrar_produccion', 10, 60);

    INSERT INTO lotes_produccion (codigo_lote, producto_id, cantidad, fecha_produccion, creado_por, es_evento)
    VALUES (p_codigo_lote, p_producto_id, p_cantidad, p_fecha_produccion, p_creado_por, p_es_evento)
    RETURNING id INTO v_lote_id;

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            INSERT INTO lote_pesos (lote_id, peso_bruto, peso_neto) VALUES (v_lote_id, v_peso, v_peso);
        END LOOP;
    END IF;

    INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
    VALUES (1, p_producto_id, p_cantidad, p_es_evento)
    ON CONFLICT (sucursal_id, producto_id, es_evento)
    DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.registrar_consumo(
    p_sucursal_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_es_evento BOOLEAN,
    p_creado_por INT
) RETURNS VOID AS $$
BEGIN
    PERFORM public.check_rate_limit('form:registrar_consumo', 10, 60);

    INSERT INTO consumo_diario (sucursal_id, producto_id, cantidad, creado_por, es_evento)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad, p_creado_por, p_es_evento);

    UPDATE stock_sucursales 
    SET cantidad = cantidad - p_cantidad
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id AND es_evento = p_es_evento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.crear_y_preparar_pedido_admin(
    p_sucursal_destino_id INT,
    p_creado_por_id INT,
    p_es_evento BOOLEAN,
    p_items JSONB
) RETURNS INT AS $$
DECLARE
    v_pedido_id INT;
    item JSONB;
BEGIN
    PERFORM public.check_rate_limit('form:crear_pedido_admin', 10, 60);

    INSERT INTO pedidos (sucursal_origen_id, sucursal_destino_id, creado_por_id, estado, es_evento)
    VALUES (1, p_sucursal_destino_id, p_creado_por_id, 'preparado', p_es_evento)
    RETURNING id INTO v_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad_solicitada, cantidad_preparada)
        VALUES (v_pedido_id, (item->>'producto_id')::INT, (item->>'cantidad')::NUMERIC, (item->>'cantidad')::NUMERIC);
    END LOOP;

    RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 5. TRIGGERS EN TABLAS DE FORMULARIOS DIRECTOS (PEDIDOS, PRODUCTOS, PROVEEDORES, MÁQUINAS, MANTENIMIENTOS)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_enforce_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_limit INT := COALESCE(TG_ARGV[0]::INT, 10);
    v_window INT := COALESCE(TG_ARGV[1]::INT, 60);
BEGIN
    PERFORM public.check_rate_limit('table:' || TG_TABLE_NAME, v_limit, v_window);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a inserciones/actualizaciones de formularios principales (10 solicitudes / 60s por IP)
DROP TRIGGER IF EXISTS rate_limit_pedidos_trg ON public.pedidos;
CREATE TRIGGER rate_limit_pedidos_trg
BEFORE INSERT ON public.pedidos
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60);

DROP TRIGGER IF EXISTS rate_limit_productos_trg ON public.productos;
CREATE TRIGGER rate_limit_productos_trg
BEFORE INSERT OR UPDATE ON public.productos
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60);

DROP TRIGGER IF EXISTS rate_limit_proveedores_trg ON public.proveedores;
CREATE TRIGGER rate_limit_proveedores_trg
BEFORE INSERT OR UPDATE ON public.proveedores
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60);

DROP TRIGGER IF EXISTS rate_limit_maquinas_trg ON public.maquinas;
CREATE TRIGGER rate_limit_maquinas_trg
BEFORE INSERT OR UPDATE ON public.maquinas
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60);

DROP TRIGGER IF EXISTS rate_limit_mantenimientos_trg ON public.mantenimientos;
CREATE TRIGGER rate_limit_mantenimientos_trg
BEFORE INSERT OR UPDATE ON public.mantenimientos
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_enforce_rate_limit(10, 60);

