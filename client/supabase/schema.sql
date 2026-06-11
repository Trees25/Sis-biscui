-- Recreación Completa de la Base de Datos Biscui
 DROP SCHEMA public CASCADE;
 CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS MAESTRAS

CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT,
    direccion TEXT
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE SET NULL,
    auth_id UUID
);

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    contacto TEXT,
    cuit TEXT,
    telefono TEXT,
    direccion TEXT,
    email TEXT
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tipo TEXT,
    activo INT DEFAULT 1,
    proveedor_id INT REFERENCES proveedores(id) ON DELETE SET NULL,
    unidad_medida TEXT,
    cant_por_caja INT,
    cant_por_pack INT
);

CREATE TABLE maquinas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE SET NULL
);

-- 3. TABLAS DE STOCK Y PRODUCCIÓN

CREATE TABLE stock_sucursales (
    id SERIAL PRIMARY KEY,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad NUMERIC DEFAULT 0,
    es_evento BOOLEAN DEFAULT FALSE,
    UNIQUE(sucursal_id, producto_id, es_evento)
);

CREATE TABLE lotes_produccion (
    id SERIAL PRIMARY KEY,
    codigo_lote TEXT NOT NULL,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    fecha_produccion TIMESTAMP DEFAULT NOW(),
    creado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    es_evento BOOLEAN DEFAULT FALSE
);

CREATE TABLE lote_pesos (
    id SERIAL PRIMARY KEY,
    lote_id INT REFERENCES lotes_produccion(id) ON DELETE CASCADE,
    peso_bruto NUMERIC,
    peso_neto NUMERIC
);

CREATE TABLE consumo_diario (
    id SERIAL PRIMARY KEY,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    creado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    es_evento BOOLEAN DEFAULT FALSE
);

CREATE TABLE mantenimientos (
    id SERIAL PRIMARY KEY,
    maquina_id INT REFERENCES maquinas(id) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT NOW(),
    descripcion TEXT,
    costo NUMERIC,
    realizado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 4. TABLAS DE PEDIDOS Y LOGÍSTICA

CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    sucursal_origen_id INT REFERENCES sucursales(id) ON DELETE SET NULL,
    sucursal_destino_id INT REFERENCES sucursales(id) ON DELETE SET NULL,
    creado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    preparado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    transportista_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    recibido_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'solicitado',
    es_evento BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_solicitada NUMERIC DEFAULT 0,
    cantidad_preparada NUMERIC DEFAULT 0,
    cantidad_recibida NUMERIC DEFAULT 0,
    diferencias TEXT
);

CREATE TABLE items_pendientes (
    id SERIAL PRIMARY KEY,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    es_evento BOOLEAN DEFAULT FALSE,
    cantidad NUMERIC DEFAULT 0
);

CREATE TABLE discrepancias (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_perdida NUMERIC NOT NULL,
    motivo TEXT,
    registrado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

-- 4.5. TABLAS DE ÓRDENES DE PRODUCCIÓN (FÁBRICA)

CREATE TABLE ordenes_produccion (
    id SERIAL PRIMARY KEY,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    fecha_requerida TIMESTAMP,
    es_evento BOOLEAN DEFAULT TRUE,
    creado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orden_produccion_detalles (
    id SERIAL PRIMARY KEY,
    orden_id INT REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_solicitada NUMERIC DEFAULT 0,
    cantidad_producida NUMERIC DEFAULT 0
);

-- 5. VISTAS

CREATE OR REPLACE VIEW v_stock_matriz AS
SELECT 
    s.id AS sucursal_id, 
    s.nombre AS sucursal_nombre, 
    p.id AS producto_id, 
    p.nombre AS producto_nombre, 
    p.categoria,
    ss.cantidad,
    ss.es_evento
FROM sucursales s
CROSS JOIN productos p
LEFT JOIN stock_sucursales ss ON ss.sucursal_id = s.id AND ss.producto_id = p.id
WHERE p.activo = 1;

CREATE OR REPLACE VIEW v_flujo_pedidos_stats AS
SELECT 
    estado,
    COUNT(*) AS total_pedidos,
    SUM(CASE WHEN es_evento THEN 1 ELSE 0 END) AS eventos
FROM pedidos
GROUP BY estado;

CREATE OR REPLACE VIEW v_auditoria_consumo AS
SELECT 
    cd.id,
    cd.sucursal_id,
    s.nombre AS sucursal_nombre,
    cd.producto_id,
    p.nombre AS producto_nombre,
    cd.cantidad,
    cd.fecha,
    u.nombre AS usuario_nombre,
    cd.es_evento
FROM consumo_diario cd
JOIN sucursales s ON s.id = cd.sucursal_id
JOIN productos p ON p.id = cd.producto_id
LEFT JOIN usuarios u ON u.id = cd.creado_por;

-- 6. FUNCIONES RPC

-- RPC: Obtener email por username
CREATE OR REPLACE FUNCTION get_user_email(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM usuarios WHERE nombre = p_username OR email = p_username LIMIT 1;
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Registrar Producción (Suma a stock fábrica)
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
BEGIN
    INSERT INTO lotes_produccion (codigo_lote, producto_id, cantidad, fecha_produccion, creado_por, es_evento)
    VALUES (p_codigo_lote, p_producto_id, p_cantidad, p_fecha_produccion, p_creado_por, p_es_evento)
    RETURNING id INTO v_lote_id;

    IF p_pesos IS NOT NULL THEN
        FOREACH v_peso IN ARRAY p_pesos
        LOOP
            INSERT INTO lote_pesos (lote_id, peso_bruto, peso_neto) VALUES (v_lote_id, v_peso, v_peso);
        END LOOP;
    END IF;

    -- Actualizar stock de fábrica (sucursal_id = 1)
    INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
    VALUES (1, p_producto_id, p_cantidad, p_es_evento)
    ON CONFLICT (sucursal_id, producto_id, es_evento)
    DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Registrar Consumo (Resta a stock sucursal manualmente)
CREATE OR REPLACE FUNCTION registrar_consumo(
    p_sucursal_id INT,
    p_producto_id INT,
    p_cantidad NUMERIC,
    p_es_evento BOOLEAN,
    p_creado_por INT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO consumo_diario (sucursal_id, producto_id, cantidad, creado_por, es_evento)
    VALUES (p_sucursal_id, p_producto_id, p_cantidad, p_creado_por, p_es_evento);

    UPDATE stock_sucursales 
    SET cantidad = cantidad - p_cantidad
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id AND es_evento = p_es_evento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Crear y Preparar Pedido (Admin)
CREATE OR REPLACE FUNCTION crear_y_preparar_pedido_admin(
    p_sucursal_destino_id INT,
    p_creado_por_id INT,
    p_es_evento BOOLEAN,
    p_items JSONB
) RETURNS INT AS $$
DECLARE
    v_pedido_id INT;
    item JSONB;
BEGIN
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

-- RPC: Preparar Pedido
CREATE OR REPLACE FUNCTION preparar_pedido(
    p_pedido_id INT,
    p_preparado_por_id INT,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    item JSONB;
BEGIN
    UPDATE pedidos SET estado = 'preparado', preparado_por_id = p_preparado_por_id WHERE id = p_pedido_id;
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE pedido_detalles 
        SET cantidad_preparada = (item->>'cantidad_preparada')::NUMERIC
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Confirmar Carga Pedido (Paso 1: Resta a Fábrica/Origen)
CREATE OR REPLACE FUNCTION confirmar_carga_pedido(
    p_pedido_id INT,
    p_transportista_id INT,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    item JSONB;
    v_origen_id INT;
    v_es_evento BOOLEAN;
BEGIN
    SELECT sucursal_origen_id, es_evento INTO v_origen_id, v_es_evento FROM pedidos WHERE id = p_pedido_id;
    IF v_origen_id IS NULL THEN v_origen_id := 1; END IF;

    UPDATE pedidos SET estado = 'en_transito', transportista_id = p_transportista_id WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE pedido_detalles 
        SET cantidad_preparada = (item->>'cantidad_cargada')::NUMERIC
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT;

        -- Descontar stock de fabrica/origen
        UPDATE stock_sucursales
        SET cantidad = cantidad - (item->>'cantidad_cargada')::NUMERIC
        WHERE sucursal_id = v_origen_id AND producto_id = (item->>'producto_id')::INT AND es_evento = v_es_evento;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Recibir Pedido (Paso 2: Suma a Sucursal Destino)
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
BEGIN
    SELECT sucursal_destino_id, es_evento INTO v_destino_id, v_es_evento FROM pedidos WHERE id = p_pedido_id;
    UPDATE pedidos SET estado = 'entregado', recibido_por_id = p_recibido_por_id WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_recibida := (item->>'cantidad_recibida')::NUMERIC;
        v_motivo := item->>'motivo_discrepancia';

        UPDATE pedido_detalles 
        SET cantidad_recibida = v_recibida, diferencias = v_motivo
        WHERE pedido_id = p_pedido_id AND producto_id = (item->>'producto_id')::INT
        RETURNING cantidad_solicitada, cantidad_preparada INTO v_solicitada, v_cargada;

        -- Sumar stock a sucursal destino
        INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad, es_evento)
        VALUES (v_destino_id, (item->>'producto_id')::INT, v_recibida, v_es_evento)
        ON CONFLICT (sucursal_id, producto_id, es_evento)
        DO UPDATE SET cantidad = stock_sucursales.cantidad + EXCLUDED.cantidad;

        -- Insertar discrepancia si hubo mermas respecto a lo cargado
        IF v_recibida < v_cargada THEN
            INSERT INTO discrepancias (pedido_id, producto_id, cantidad_perdida, motivo, registrado_por_id)
            VALUES (p_pedido_id, (item->>'producto_id')::INT, v_cargada - v_recibida, COALESCE(v_motivo, 'Faltante en transporte'), p_recibido_por_id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
