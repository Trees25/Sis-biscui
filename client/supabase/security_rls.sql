-- =========================================================================
-- SCRIPT DE SEGURIDAD BISCUI (ROW LEVEL SECURITY & RPCs)
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


-- 2. CREAR POLÍTICAS DE LECTURA (SELECT)

-- Entidades públicas para usuarios autenticados
CREATE POLICY "Lectura global de entidades maestras" ON sucursales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura global de productos" ON productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura global de proveedores" ON proveedores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura global de maquinas" ON maquinas FOR SELECT USING (auth.role() = 'authenticated');

-- Usuarios: Un usuario puede ver sus propios datos o el admin ve todos
CREATE POLICY "Lectura de usuarios" ON usuarios FOR SELECT USING (
    auth.uid() = auth_id OR 
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) = 'admin'
);

-- Stock: Las sucursales ven su propio stock o el de fábrica (id=1). El admin ve todo.
CREATE POLICY "Lectura de stock" ON stock_sucursales FOR SELECT USING (
    sucursal_id = (SELECT sucursal_id FROM usuarios WHERE auth_id = auth.uid()) OR
    sucursal_id = 1 OR
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) = 'admin'
);

-- Pedidos: Sucursales ven sus pedidos (origen/destino). Transporte/Fábrica/Admin ven todos.
CREATE POLICY "Lectura de pedidos" ON pedidos FOR SELECT USING (
    sucursal_origen_id = (SELECT sucursal_id FROM usuarios WHERE auth_id = auth.uid()) OR
    sucursal_destino_id = (SELECT sucursal_id FROM usuarios WHERE auth_id = auth.uid()) OR
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('admin', 'transportista', 'heladero', 'pastelero', 'pastelero_helado')
);

CREATE POLICY "Lectura de detalles de pedidos" ON pedido_detalles FOR SELECT USING (
    pedido_id IN (SELECT id FROM pedidos)
);

-- Ordenes de Produccion: Visibles para todos los usuarios autenticados (necesario para ver si hay faltantes en produccion)
CREATE POLICY "Lectura global de ordenes de produccion" ON ordenes_produccion FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura global de orden_detalles" ON orden_produccion_detalles FOR SELECT USING (auth.role() = 'authenticated');

-- Consumos diarios y discrepancias
CREATE POLICY "Lectura de consumos" ON consumo_diario FOR SELECT USING (
    sucursal_id = (SELECT sucursal_id FROM usuarios WHERE auth_id = auth.uid()) OR
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) = 'admin'
);

CREATE POLICY "Lectura de discrepancias" ON discrepancias FOR SELECT USING (auth.role() = 'authenticated');


-- 3. ACTUALIZAR VISTAS PARA QUE RESPETEN RLS
ALTER VIEW v_stock_matriz SET (security_invoker = true);
ALTER VIEW v_flujo_pedidos_stats SET (security_invoker = true);
ALTER VIEW v_auditoria_consumo SET (security_invoker = true);


-- 4. AÑADIR VALIDACIONES DE SEGURIDAD A LOS RPCs (FUNCIONES)

-- RPC: Registrar Producción (Solo Fábrica / Admin)
CREATE OR REPLACE FUNCTION registrar_produccion(
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
    v_rol TEXT;
BEGIN
    SELECT rol INTO v_rol FROM usuarios WHERE auth_id = auth.uid();
    IF v_rol NOT IN ('admin', 'heladero', 'pastelero', 'pastelero_helado') THEN
        RAISE EXCEPTION 'Permiso denegado: Solo el personal de fábrica puede registrar producción.';
    END IF;

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


-- RPC: Confirmar Carga Pedido (Solo Transportista / Admin)
CREATE OR REPLACE FUNCTION confirmar_carga_pedido(
    p_pedido_id INT,
    p_transportista_id INT,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    item JSONB;
    v_origen_id INT;
    v_es_evento BOOLEAN;
    v_rol TEXT;
BEGIN
    SELECT rol INTO v_rol FROM usuarios WHERE auth_id = auth.uid();
    IF v_rol NOT IN ('admin', 'transportista') THEN
        RAISE EXCEPTION 'Permiso denegado: Solo transportistas pueden cargar pedidos.';
    END IF;

    SELECT sucursal_origen_id, es_evento INTO v_origen_id, v_es_evento FROM pedidos WHERE id = p_pedido_id;
    IF v_origen_id IS NULL THEN v_origen_id := 1; END IF;

    UPDATE pedidos SET estado = 'en_transito', transportista_id = p_transportista_id WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE pedido_detalles 
        SET cantidad_preparada = (item->>'cantidad_cargada')::NUMERIC
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT;

        UPDATE stock_sucursales
        SET cantidad = cantidad - (item->>'cantidad_cargada')::NUMERIC
        WHERE sucursal_id = v_origen_id AND producto_id = (item->>'producto_id')::INT AND es_evento = v_es_evento;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Recibir Pedido (Solo la Sucursal de Destino / Admin)
CREATE OR REPLACE FUNCTION recibir_pedido(
    p_pedido_id INT,
    p_recibido_por_id INT,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    item JSONB;
    v_destino_id INT;
    v_es_evento BOOLEAN;
    v_motivo TEXT;
    v_solicitada NUMERIC;
    v_cargada NUMERIC;
    v_recibida NUMERIC;
    v_rol TEXT;
    v_user_sucursal INT;
BEGIN
    SELECT rol, sucursal_id INTO v_rol, v_user_sucursal FROM usuarios WHERE auth_id = auth.uid();
    SELECT sucursal_destino_id, es_evento INTO v_destino_id, v_es_evento FROM pedidos WHERE id = p_pedido_id;
    
    IF v_rol != 'admin' AND v_user_sucursal != v_destino_id THEN
        RAISE EXCEPTION 'Permiso denegado: Solo puedes recibir pedidos destinados a tu sucursal.';
    END IF;

    UPDATE pedidos SET estado = 'entregado', recibido_por_id = p_recibido_por_id WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_recibida := (item->>'cantidad_recibida')::NUMERIC;
        v_motivo := item->>'motivo_discrepancia';

        UPDATE pedido_detalles 
        SET cantidad_recibida = v_recibida, diferencias = v_motivo
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT
        RETURNING cantidad_solicitada, cantidad_preparada INTO v_solicitada, v_cargada;

        INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
        VALUES (v_destino_id, (item->>'producto_id')::INT, v_recibida, v_es_evento)
        ON CONFLICT (sucursal_id, producto_id, es_evento)
        DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;

        IF v_recibida < v_cargada THEN
            INSERT INTO discrepancias (pedido_id, producto_id, cantidad_perdida, motivo, registrado_por_id)
            VALUES (p_pedido_id, (item->>'producto_id')::INT, v_cargada - v_recibida, COALESCE(v_motivo, 'Faltante en transporte'), p_recibido_por_id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
