-- =========================================================================
-- VALIDACIÓN DEL LADO DEL SERVIDOR (BACKEND SUPABASE / POSTGRESQL)
-- Valida tipos de datos, rangos, formatos, estados y permisos por acción
-- (CREAR, EDITAR, ELIMINAR, COSTOS/PAGOS Y RPCs) ignorando el frontend.
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. FUNCIONES AUXILIARES DE IDENTIDAD Y SANITIZACIÓN EN EL SERVIDOR
-- -------------------------------------------------------------------------

-- Obtiene el rol real del usuario autenticado desde su token JWT (auth.uid()),
-- impidiendo que un atacante falsifique su user_id o rol en el body JSON.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_rol TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT rol INTO v_rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Obtiene la sucursal real asignada al usuario autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_sucursal()
RETURNS INT AS $$
DECLARE
    v_sucursal_id INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT sucursal_id INTO v_sucursal_id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
    RETURN v_sucursal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica que un texto no supere la longitud máxima, no contenga etiquetas HTML/XSS (< >)
-- ni inyección de fórmulas de hojas de cálculo (=, +, @ al inicio).
-- Nota: PostgreSQL rechaza bytes nulos a nivel de protocolo/tipo TEXT de forma nativa
-- (invocar chr(0) lanza 54000: "null character not permitted").
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

-- -------------------------------------------------------------------------
-- 2. RESTRICCIONES DE DOMINIO Y TIPOS DE DATO (CHECK CONSTRAINTS)
-- -------------------------------------------------------------------------

-- A) PROVEEDORES: nombre obligatorio sin XSS, CUIT de 11 dígitos, teléfono y email válidos
ALTER TABLE public.proveedores DROP CONSTRAINT IF EXISTS chk_proveedores_valid;
ALTER TABLE public.proveedores ADD CONSTRAINT chk_proveedores_valid CHECK (
    char_length(trim(nombre)) >= 2
    AND public.is_safe_text(nombre, 120)
    AND public.is_safe_text(direccion, 200)
    AND (cuit IS NULL OR cuit ~ '^(\d{2}-\d{8}-\d{1}|\d{11})$')
    AND (telefono IS NULL OR telefono ~ '^[0-9+\-\s()]{6,25}$')
    AND (email IS NULL OR email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$')
) NOT VALID;

-- B) PRODUCTOS: categoría en lista blanca, nombre seguro, unidades positivas
ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS chk_productos_valid;
ALTER TABLE public.productos ADD CONSTRAINT chk_productos_valid CHECK (
    char_length(trim(nombre)) >= 2
    AND public.is_safe_text(nombre, 120)
    AND categoria IN ('helados', 'pasteleria_helada', 'pasteleria', 'sembrados', 'termicos', 'sin_tacc', 'otros')
    AND public.is_safe_text(tipo, 80)
    AND (unidad_medida IS NULL OR unidad_medida IN ('unidad', 'peso'))
    AND (cant_por_caja IS NULL OR (cant_por_caja >= 1 AND cant_por_caja <= 10000))
    AND (cant_por_pack IS NULL OR (cant_por_pack >= 1 AND cant_por_pack <= 10000))
) NOT VALID;

-- C) STOCK SUCURSALES: nunca negativo ni mayor al límite físico
ALTER TABLE public.stock_sucursales DROP CONSTRAINT IF EXISTS chk_stock_cantidad_valid;
ALTER TABLE public.stock_sucursales ADD CONSTRAINT chk_stock_cantidad_valid CHECK (
    cantidad >= 0 AND cantidad <= 100000
) NOT VALID;

-- D) LOTES DE PRODUCCIÓN Y PESOS: cantidades estrictamente mayores a 0
ALTER TABLE public.lotes_produccion DROP CONSTRAINT IF EXISTS chk_lotes_cantidad_valid;
ALTER TABLE public.lotes_produccion ADD CONSTRAINT chk_lotes_cantidad_valid CHECK (
    cantidad > 0 AND cantidad <= 100000 AND public.is_safe_text(codigo_lote, 50)
) NOT VALID;

ALTER TABLE public.lote_pesos DROP CONSTRAINT IF EXISTS chk_lote_pesos_valid;
ALTER TABLE public.lote_pesos ADD CONSTRAINT chk_lote_pesos_valid CHECK (
    peso_bruto > 0 AND peso_bruto <= 500 AND peso_neto >= 0 AND peso_neto <= 500
) NOT VALID;

-- E) CONSUMO DIARIO: cantidad estrictamente positiva
ALTER TABLE public.consumo_diario DROP CONSTRAINT IF EXISTS chk_consumo_cantidad_valid;
ALTER TABLE public.consumo_diario ADD CONSTRAINT chk_consumo_cantidad_valid CHECK (
    cantidad > 0 AND cantidad <= 100000
) NOT VALID;

-- F) PEDIDOS Y DETALLES: estados válidos y cantidades no negativas
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS chk_pedidos_estado_valid;
ALTER TABLE public.pedidos ADD CONSTRAINT chk_pedidos_estado_valid CHECK (
    estado IN ('solicitado', 'preparado', 'en_transito', 'entregado', 'con_discrepancia', 'cancelado')
) NOT VALID;

ALTER TABLE public.pedido_detalles DROP CONSTRAINT IF EXISTS chk_pedido_detalles_valid;
ALTER TABLE public.pedido_detalles ADD CONSTRAINT chk_pedido_detalles_valid CHECK (
    cantidad_solicitada > 0 AND cantidad_solicitada <= 100000
    AND (cantidad_preparada IS NULL OR (cantidad_preparada >= 0 AND cantidad_preparada <= 100000))
    AND (cantidad_recibida IS NULL OR (cantidad_recibida >= 0 AND cantidad_recibida <= 100000))
    AND public.is_safe_text(diferencias, 300)
) NOT VALID;

-- G) DISCREPANCIAS Y ÓRDENES DE PRODUCCIÓN
ALTER TABLE public.discrepancias DROP CONSTRAINT IF EXISTS chk_discrepancias_valid;
ALTER TABLE public.discrepancias ADD CONSTRAINT chk_discrepancias_valid CHECK (
    cantidad_perdida > 0 AND cantidad_perdida <= 100000
    AND public.is_safe_text(motivo, 300)
) NOT VALID;

ALTER TABLE public.ordenes_produccion DROP CONSTRAINT IF EXISTS chk_ordenes_prod_valid;
ALTER TABLE public.ordenes_produccion ADD CONSTRAINT chk_ordenes_prod_valid CHECK (
    estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')
    AND public.is_safe_text(notas, 300)
) NOT VALID;

ALTER TABLE public.orden_produccion_detalles DROP CONSTRAINT IF EXISTS chk_orden_prod_detalles_valid;
ALTER TABLE public.orden_produccion_detalles ADD CONSTRAINT chk_orden_prod_detalles_valid CHECK (
    cantidad_solicitada > 0 AND cantidad_solicitada <= 100000
    AND cantidad_producida >= 0 AND cantidad_producida <= cantidad_solicitada
) NOT VALID;

-- H) MÁQUINAS Y MANTENIMIENTOS (Incluye validación financiera de COSTO / PAGO)
ALTER TABLE public.maquinas DROP CONSTRAINT IF EXISTS chk_maquinas_valid;
ALTER TABLE public.maquinas ADD CONSTRAINT chk_maquinas_valid CHECK (
    char_length(trim(nombre)) >= 2
    AND public.is_safe_text(nombre, 120)
    AND public.is_safe_text(descripcion, 500)
) NOT VALID;

ALTER TABLE public.mantenimientos DROP CONSTRAINT IF EXISTS chk_mantenimientos_valid;
ALTER TABLE public.mantenimientos ADD CONSTRAINT chk_mantenimientos_valid CHECK (
    char_length(trim(descripcion)) >= 3
    AND public.is_safe_text(descripcion, 500)
    AND (costo IS NULL OR (costo >= 0 AND costo <= 100000000))
) NOT VALID;

-- -------------------------------------------------------------------------
-- 3. TRIGGERS DE VALIDACIÓN DE REGLAS DE NEGOCIO Y PERMISOS POR ACCIÓN
--    (CREAR, EDITAR, ELIMINAR, COSTOS/PAGOS)
-- -------------------------------------------------------------------------

-- A) Protección de Entidades Administrativas (Proveedores, Máquinas, Mantenimientos/Costos)
CREATE OR REPLACE FUNCTION public.trg_validate_admin_entities()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
BEGIN
    -- Permitir migraciones internas ejecutadas desde el SQL Editor (postgres / service_role)
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Solo el rol 'admin' puede CREAR, EDITAR o ELIMINAR proveedores, máquinas o mantenimientos/costos
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado en servidor: solo un administrador puede % en la tabla %.',
            TG_OP, TG_TABLE_NAME
            USING ERRCODE = '42501', HINT = 'UNAUTHORIZED_ROLE';
    END IF;

    -- Validación adicional en mantenimientos (Costos / Pagos)
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

DROP TRIGGER IF EXISTS validate_proveedores_action_trg ON public.proveedores;
CREATE TRIGGER validate_proveedores_action_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.proveedores
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_admin_entities();

DROP TRIGGER IF EXISTS validate_maquinas_action_trg ON public.maquinas;
CREATE TRIGGER validate_maquinas_action_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.maquinas
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_admin_entities();

DROP TRIGGER IF EXISTS validate_mantenimientos_action_trg ON public.mantenimientos;
CREATE TRIGGER validate_mantenimientos_action_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.mantenimientos
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_admin_entities();

-- B) Protección de Catálogo de Productos (Crear, Editar, Eliminar)
CREATE OR REPLACE FUNCTION public.trg_validate_productos_action()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF v_role IS DISTINCT FROM 'admin' THEN
            RAISE EXCEPTION 'Acceso denegado: solo un administrador puede eliminar productos.'
                USING ERRCODE = '42501';
        END IF;
        RETURN OLD;
    END IF;

    -- Sanitizar nombre en servidor
    NEW.nombre := trim(regexp_replace(COALESCE(NEW.nombre, ''), '<[^>]*>', '', 'g'));
    IF char_length(NEW.nombre) < 2 OR NEW.nombre ~ '[<>]' OR NEW.nombre ~ '^[=+@]' THEN
        RAISE EXCEPTION 'Validación rechazada: el nombre del producto es inválido o contiene caracteres prohibidos.'
            USING ERRCODE = '22023';
    END IF;

    -- Sucursal solo puede crear productos personalizados dentro de la categoría 'otros'
    IF v_role = 'sucursal' THEN
        IF TG_OP = 'UPDATE' OR NEW.categoria IS DISTINCT FROM 'otros' THEN
            RAISE EXCEPTION 'Acceso denegado: una sucursal solo puede dar de alta insumos en la categoría "otros".'
                USING ERRCODE = '42501';
        END IF;
    ELSIF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado: tu rol (%) no tiene permisos para crear o editar productos.', v_role
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_productos_action_trg ON public.productos;
CREATE TRIGGER validate_productos_action_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_productos_action();

-- C) Protección de Pedidos (Integridad de Estados y Eliminación)
CREATE OR REPLACE FUNCTION public.trg_validate_pedidos_action()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
    v_user_sucursal INT := public.get_current_user_sucursal();
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF v_role IS DISTINCT FROM 'admin' THEN
            RAISE EXCEPTION 'Acceso denegado: solo un administrador puede eliminar pedidos.'
                USING ERRCODE = '42501';
        END IF;
        IF OLD.estado IN ('en_transito', 'entregado') THEN
            RAISE EXCEPTION 'Operación rechazada: no se puede eliminar un pedido que ya está en tránsito o entregado.'
                USING ERRCODE = 'P0001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Si es usuario de sucursal, no puede crear pedidos a nombre de otra sucursal
        IF v_role = 'sucursal' AND NEW.sucursal_destino_id IS DISTINCT FROM v_user_sucursal THEN
            RAISE EXCEPTION 'Acceso denegado: no puedes crear pedidos para otra sucursal (ID %).', NEW.sucursal_destino_id
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_pedidos_action_trg ON public.pedidos;
CREATE TRIGGER validate_pedidos_action_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_pedidos_action();

-- D) Protección de Stock en Sucursales (Impedir stock negativo en INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.trg_validate_stock_action()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cantidad IS NULL OR NEW.cantidad < 0 OR NEW.cantidad > 100000 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: la cantidad de stock (%) no puede ser negativa ni superar 100.000.',
            NEW.cantidad
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_stock_action_trg ON public.stock_sucursales;
CREATE TRIGGER validate_stock_action_trg
BEFORE INSERT OR UPDATE ON public.stock_sucursales
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_stock_action();

-- -------------------------------------------------------------------------
-- 4. VALIDACIÓN ESTRICTA DENTRO DE LOS ENDPOINTS RPC DEL BACKEND
-- -------------------------------------------------------------------------

-- A) RPC: Registrar Producción (Valida rol, cantidades > 0, pesos válidos y código de lote)
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
    v_role TEXT := public.get_current_user_role();
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

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            IF v_peso IS NULL OR v_peso <= 0 OR v_peso > 500 THEN
                RAISE EXCEPTION 'Validación en servidor fallida: peso unitario inválido (%).', v_peso
                    USING ERRCODE = '22003';
            END IF;
        END LOOP;
    END IF;

    INSERT INTO lotes_produccion (codigo_lote, producto_id, cantidad, fecha_produccion, creado_por, es_evento)
    VALUES (trim(p_codigo_lote), p_producto_id, p_cantidad, COALESCE(p_fecha_produccion, NOW()), p_creado_por, COALESCE(p_es_evento, FALSE))
    RETURNING id INTO v_lote_id;

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            INSERT INTO lote_pesos (lote_id, peso_bruto, peso_neto) VALUES (v_lote_id, v_peso, v_peso);
        END LOOP;
    END IF;

    INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
    VALUES (1, p_producto_id, p_cantidad, COALESCE(p_es_evento, FALSE))
    ON CONFLICT (sucursal_id, producto_id, es_evento)
    DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) RPC: Registrar Consumo (Valida sucursal del usuario, cantidad > 0 y stock disponible)
CREATE OR REPLACE FUNCTION public.registrar_consumo(
    p_sucursal_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_es_evento BOOLEAN,
    p_creado_por INT
) RETURNS VOID AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
    v_user_sucursal INT := public.get_current_user_sucursal();
    v_stock_actual NUMERIC;
BEGIN
    PERFORM public.check_rate_limit('form:registrar_consumo', 10, 60);

    IF p_sucursal_id IS NULL OR p_sucursal_id <= 0 OR p_producto_id IS NULL OR p_producto_id <= 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: sucursal o producto inválido.'
            USING ERRCODE = '22023';
    END IF;

    IF v_role = 'sucursal' AND p_sucursal_id IS DISTINCT FROM v_user_sucursal THEN
        RAISE EXCEPTION 'Acceso denegado: no puedes registrar consumos sobre otra sucursal.'
            USING ERRCODE = '42501';
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100000 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: la cantidad de consumo (%) debe ser mayor a 0.', p_cantidad
            USING ERRCODE = '22003';
    END IF;

    SELECT cantidad INTO v_stock_actual
    FROM stock_sucursales
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id AND es_evento = COALESCE(p_es_evento, FALSE);

    IF COALESCE(v_stock_actual, 0) < p_cantidad THEN
        RAISE EXCEPTION 'Operación rechazada en servidor: stock insuficiente en la sucursal (disponible: %, solicitado: %).',
            COALESCE(v_stock_actual, 0), p_cantidad
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO consumo_diario (sucursal_id, producto_id, cantidad, creado_por, es_evento)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad, p_creado_por, COALESCE(p_es_evento, FALSE));

    UPDATE stock_sucursales 
    SET cantidad = GREATEST(0, cantidad - p_cantidad)
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id AND es_evento = COALESCE(p_es_evento, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C) RPC: Crear y Preparar Pedido Admin (Valida array JSONB no vacío y cantidades positivas)
CREATE OR REPLACE FUNCTION public.crear_y_preparar_pedido_admin(
    p_sucursal_destino_id INT,
    p_creado_por_id INT,
    p_es_evento BOOLEAN,
    p_items JSONB
) RETURNS INT AS $$
DECLARE
    v_pedido_id INT;
    item JSONB;
    v_prod_id INT;
    v_qty NUMERIC;
BEGIN
    PERFORM public.check_rate_limit('form:crear_pedido_admin', 10, 60);

    IF p_sucursal_destino_id IS NULL OR p_sucursal_destino_id <= 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: sucursal de destino inválida.'
            USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: el pedido debe contener al menos un producto.'
            USING ERRCODE = '22023';
    END IF;

    -- Validar todos los ítems antes de insertar el pedido
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (item->>'producto_id')::INT;
        v_qty := (item->>'cantidad')::NUMERIC;
        IF v_prod_id IS NULL OR v_prod_id <= 0 OR v_qty IS NULL OR v_qty <= 0 OR v_qty > 100000 THEN
            RAISE EXCEPTION 'Validación en servidor fallida: ítem con producto (%) o cantidad (%) inválida.', v_prod_id, v_qty
                USING ERRCODE = '22003';
        END IF;
    END LOOP;

    INSERT INTO pedidos (sucursal_origen_id, sucursal_destino_id, creado_por_id, estado, es_evento)
    VALUES (1, p_sucursal_destino_id, p_creado_por_id, 'preparado', COALESCE(p_es_evento, FALSE))
    RETURNING id INTO v_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad_solicitada, cantidad_preparada)
        VALUES (v_pedido_id, (item->>'producto_id')::INT, (item->>'cantidad')::NUMERIC, (item->>'cantidad')::NUMERIC);
    END LOOP;

    RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D) RPC: Recibir Pedido (Impide doble recepción y valida cantidades >= 0)
CREATE OR REPLACE FUNCTION public.recibir_pedido(
    p_pedido_id INT,
    p_recibido_por_id INT,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    item JSONB;
    v_destino_id INT;
    v_estado_actual TEXT;
    v_es_evento BOOLEAN;
    v_motivo TEXT;
    v_solicitada NUMERIC;
    v_cargada NUMERIC;
    v_recibida NUMERIC;
BEGIN
    SELECT sucursal_destino_id, estado, es_evento
    INTO v_destino_id, v_estado_actual, v_es_evento
    FROM pedidos WHERE id = p_pedido_id;

    IF v_destino_id IS NULL THEN
        RAISE EXCEPTION 'Validación en servidor fallida: el pedido #% no existe.', p_pedido_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_estado_actual IN ('entregado', 'con_discrepancia') THEN
        RAISE EXCEPTION 'Operación rechazada en servidor: el pedido #% ya fue recibido anteriormente.', p_pedido_id
            USING ERRCODE = 'P0001';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Validación en servidor fallida: debes enviar el detalle de ítems recibidos.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE pedidos SET estado = 'entregado', recibido_por_id = p_recibido_por_id WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_recibida := (item->>'cantidad_recibida')::NUMERIC;
        v_motivo := trim(regexp_replace(COALESCE(item->>'motivo_discrepancia', item->>'motivo_diferencia', ''), '<[^>]*>', '', 'g'));

        IF v_recibida IS NULL OR v_recibida < 0 OR v_recibida > 100000 THEN
            RAISE EXCEPTION 'Validación en servidor fallida: cantidad recibida inválida (%).', v_recibida
                USING ERRCODE = '22003';
        END IF;

        UPDATE pedido_detalles 
        SET cantidad_recibida = v_recibida, diferencias = left(v_motivo, 300)
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT
        RETURNING cantidad_solicitada, cantidad_preparada INTO v_solicitada, v_cargada;

        INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
        VALUES (v_destino_id, (item->>'producto_id')::INT, v_recibida, v_es_evento)
        ON CONFLICT (sucursal_id, producto_id, es_evento)
        DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;

        IF v_recibida < v_cargada THEN
            INSERT INTO discrepancias (pedido_id, producto_id, cantidad_perdida, motivo, registrado_por_id)
            VALUES (p_pedido_id, (item->>'producto_id')::INT, v_cargada - v_recibida, COALESCE(NULLIF(v_motivo, ''), 'Faltante en transporte'), p_recibido_por_id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
