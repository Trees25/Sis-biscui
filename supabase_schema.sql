-- ==========================================
-- SCRIPT DE INICIALIZACIÓN - SUPABASE (POSTGRESQL)
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- ==========================================

-- Limpiar tablas si existen (opcional)
DROP TABLE IF EXISTS consumo_diario CASCADE;
DROP TABLE IF EXISTS discrepancias CASCADE;
DROP TABLE IF EXISTS pedido_detalles CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS lotes_produccion CASCADE;
DROP TABLE IF EXISTS stock_sucursales CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;
DROP TABLE IF EXISTS productos CASCADE;

-- 1. Productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK(categoria IN ('helados', 'pasteleria_helada', 'pasteleria', 'viennoiserie', 'termicos', 'otros')),
    tipo VARCHAR(100) NOT NULL,
    activo INTEGER DEFAULT 1
);

-- 2. Sucursales
CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion VARCHAR(255)
);

-- 3. Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK(rol IN ('admin', 'heladero', 'pastelero', 'transportista', 'sucursal')),
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE SET NULL
);

-- 4. Stock Sucursales
CREATE TABLE stock_sucursales (
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 0,
    PRIMARY KEY (sucursal_id, producto_id)
);

-- 5. Lotes de Producción
CREATE TABLE lotes_produccion (
    id SERIAL PRIMARY KEY,
    codigo_lote VARCHAR(100) NOT NULL UNIQUE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    pesos NUMERIC[] DEFAULT '{}',
    fecha_produccion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 6. Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    sucursal_origen_id INTEGER DEFAULT 1 REFERENCES sucursales(id) ON DELETE SET NULL,
    sucursal_destino_id INTEGER NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'solicitado' CHECK(estado IN ('solicitado', 'preparado', 'en_transito', 'entregado', 'con_discrepancia')),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_preparacion TIMESTAMP WITH TIME ZONE,
    fecha_despacho TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    creado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    preparado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    transportista_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    recibido_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 7. Detalles de Pedidos
CREATE TABLE pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_solicitada INTEGER NOT NULL,
    cantidad_preparada INTEGER DEFAULT 0,
    cantidad_cargada INTEGER DEFAULT 0,
    cantidad_recibida INTEGER DEFAULT 0
);

-- 8. Discrepancias / Mermas / Pérdidas
CREATE TABLE discrepancias (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK(tipo IN ('transito', 'recepcion', 'merma_fabrica', 'merma_sucursal')),
    cantidad_perdida INTEGER NOT NULL,
    motivo VARCHAR(500),
    reportado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_reporte TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Historial de Consumo Diario
CREATE TABLE consumo_diario (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DATOS SEMILLA (SEED)
-- ==========================================

-- Insertar Sucursales
INSERT INTO sucursales (id, nombre, direccion) VALUES 
(1, 'Fábrica (Depósito)', 'Calle Falsa 123 (Planta Alta)'),
(2, 'Sucursal Centro', 'Av. San Martín 450'),
(3, 'Sucursal Shopping', 'Shopping Plaza, Local 14'),
(4, 'Sucursal Principal', 'Calle Falsa 123 (Planta Baja)')
ON CONFLICT (id) DO NOTHING;


-- 1. Insertar Helados (vasquetas 5-6kg, baldes 4kg y 8kg) para todos los sabores
DO $$
DECLARE
    flavor_name TEXT;
    flavors TEXT[] := ARRAY[
        'Tramontana', 'Limón al Agua', 'Frutilla a la Crema', 'Crema Americana', 'Chocolate Amargo',
        'Dulce de Leche Tentación', 'Frutos del Bosque', 'Chocotorta', 'Bicuí', 'Rogel', 'Granizado', 
        'Coco crunch', 'Chocolate con almendras', 'Marquise', 'Alfajor', 'Black', 'Patagonia', 'Blanco con maracuyá', 
        'Dubai', 'Frutilla condensada', 'Coquitas', 'Mascarpone', 'Tiramisú', 'Lemon pie', 'Oreo', 
        'Menta granizada', 'Snickers', 'Caramel Macchiato', 'Cinnamon roll', 'Vainilla french', 
        'Oreo sin TACC', 'Oreo sin TACC (Sin Gluten)', 'Granizado (Sin Gluten)', 
        'Frutilla condensada (Sin Gluten)', 'Mascarpone (Sin Gluten)', 'Pistacho (Sin Gluten)', 
        'Banana split (Sin Gluten)', 'Sambayon (Sin Gluten)', 'Limonada', 'Frutilla citrica', 
        'Durazno y kiwi', 'Pasion frutal'
    ];
    t_name TEXT;
    t_type TEXT;
BEGIN
    FOREACH flavor_name IN ARRAY flavors LOOP
        -- Vasqueta
        t_name := 'Vasqueta ' || flavor_name;
        t_type := 'vasqueta_5_6k';
        IF NOT EXISTS (SELECT 1 FROM productos WHERE nombre = t_name AND tipo = t_type) THEN
            INSERT INTO productos (nombre, categoria, tipo) VALUES (t_name, 'helados', t_type);
        END IF;

        -- Balde 5k
        t_name := 'Balde ' || flavor_name || ' 5k';
        t_type := 'balde_4k';
        IF NOT EXISTS (SELECT 1 FROM productos WHERE nombre = t_name AND tipo = t_type) THEN
            INSERT INTO productos (nombre, categoria, tipo) VALUES (t_name, 'helados', t_type);
        END IF;

        -- Balde 10k
        t_name := 'Balde ' || flavor_name || ' 10k';
        t_type := 'balde_8k';
        IF NOT EXISTS (SELECT 1 FROM productos WHERE nombre = t_name AND tipo = t_type) THEN
            INSERT INTO productos (nombre, categoria, tipo) VALUES (t_name, 'helados', t_type);
        END IF;
    END LOOP;
END $$;

-- 2. Insertar Otros Productos
INSERT INTO productos (nombre, categoria, tipo) VALUES 
-- Pastelería Helada
('Cubanitos Helados', 'pasteleria_helada', 'cubanitos'),
('Postre de Buche Oreo', 'pasteleria_helada', 'buche_oreo'),
('Postre de Buche Tiramisú', 'pasteleria_helada', 'buche_tiramisu'),
('Paleta Oreo', 'pasteleria_helada', 'paleta'),
('Paleta Frutilla', 'pasteleria_helada', 'paleta'),
('Paleta Chocotorta', 'pasteleria_helada', 'paleta'),
('Mini Paleta Oreo', 'pasteleria_helada', 'mini_paleta'),
('Mini Paleta Frutilla', 'pasteleria_helada', 'mini_paleta'),
('Mini Paleta Chocotorta', 'pasteleria_helada', 'mini_paleta'),
('Lingote de Chocolate', 'pasteleria_helada', 'lingote'),
('Lingote de Chocotorta', 'pasteleria_helada', 'lingote'),
('Mini Cake Lemon Pie Helado', 'pasteleria_helada', 'mini_cake'),

-- Pastelería
('Lemon Pie', 'pasteleria', 'lemon_pie'),
('Cheesecake de Frutos Rojos', 'pasteleria', 'cheesecake'),
('Cheesecake de Maracuyá', 'pasteleria', 'cheesecake'),
('Mini Cheesecake Frutos Rojos', 'pasteleria', 'mini_cheesecake'),
('Mini Cheesecake Maracuyá', 'pasteleria', 'mini_cheesecake'),
('Pirinea', 'pasteleria', 'pirinea'),
('Mini Pirinea', 'pasteleria', 'mini_pirinea'),
('Torta Rogel', 'pasteleria', 'torta'),
('Torta Matilda', 'pasteleria', 'torta'),
('Torta Carrot Cake', 'pasteleria', 'torta'),

-- Viennoiserie
('Roll de Canela', 'viennoiserie', 'roll'),
('Croissant', 'viennoiserie', 'croissant'),
('Brownie', 'viennoiserie', 'brownie'),
('Medialunas', 'viennoiserie', 'viennoiserie_otra'),

-- Térmicos
('Vaso de 1 bocha', 'termicos', 'vaso_1_bocha'),
('Vaso de 2 bochas', 'termicos', 'vaso_2_bochas'),
('Térmico de 1/4 kg', 'termicos', 'termico_1_4'),
('Térmico de 1/2 kg', 'termicos', 'termico_1_2'),
('Térmico de 3/4 kg', 'termicos', 'termico_3_4'),
('Térmico de 1 kg', 'termicos', 'termico_1k'),
('Térmico de Buche', 'termicos', 'termico_buche'),

-- Otros
('Bolsa de Papel Biscui', 'otros', 'packaging'),
('Cinta adhesiva de embalaje', 'otros', 'insumo'),
('Cucharas plásticas x100 u.', 'otros', 'insumo'),
('Servilletas descartables x250 u.', 'otros', 'insumo');

-- Insertar Usuarios
INSERT INTO usuarios (nombre, email, password, rol, sucursal_id) VALUES 
('admin', 'admin@biscui.com', 'admin', 'admin', NULL),
('heladero', 'heladero@biscui.com', '123', 'heladero', NULL),
('pastelero', 'pastelero@biscui.com', '123', 'pastelero', NULL),
('driver', 'driver@biscui.com', '123', 'transportista', NULL),
('empleado1', 'empleado1@biscui.com', '123', 'sucursal', 4),
('empleado2', 'empleado2@biscui.com', '123', 'sucursal', 2),
('empleado3', 'empleado3@biscui.com', '123', 'sucursal', 3);

-- Inicializar Stocks en Sucursales a cero
DO $$
DECLARE
    prod_rec RECORD;
BEGIN
    FOR prod_rec IN SELECT id FROM productos LOOP
        INSERT INTO stock_sucursales (sucursal_id, producto_id, cantidad) VALUES 
        (1, prod_rec.id, 0),
        (2, prod_rec.id, 0),
        (3, prod_rec.id, 0),
        (4, prod_rec.id, 0)
        ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad = EXCLUDED.cantidad;
    END LOOP;
END $$;



-- ==========================================
-- ACTIVAR RLS Y CONFIGURAR POLÍTICAS
-- Para cumplir con las directivas de seguridad de Supabase y permitir el acceso de la app
-- ==========================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_diario ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todas las operaciones desde la Anon Key
CREATE POLICY "Permitir todo en usuarios" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en productos" ON productos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en sucursales" ON sucursales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en stock_sucursales" ON stock_sucursales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en lotes_produccion" ON lotes_produccion FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pedidos" ON pedidos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pedido_detalles" ON pedido_detalles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en discrepancias" ON discrepancias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en consumo_diario" ON consumo_diario FOR ALL TO anon USING (true) WITH CHECK (true);

