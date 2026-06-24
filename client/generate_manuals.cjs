const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Manuales_Admin');

const manuals = {
  '01_Flujo_Auditoria_Pedidos.md': `# 📊 1. Flujo y Auditoría de Pedidos (Flujo de Caja)

## 🎯 Objetivo Principal
Monitorear el estado de las transacciones, pedidos y entregas en tiempo real, brindando una visión financiera y operativa integral del flujo de trabajo de Biscui.

---

## ⚙️ Funcionalidades Detalladas

### 1. Panel de Búsqueda y Filtros Rápidos
* **🔍 Buscador Global:** Permite ingresar el ID del pedido, el nombre de la sucursal de destino o el estado (ej. "Entregado", "Pendiente").
* **Vista de Tabla Dinámica:** Actualiza los resultados automáticamente mientras escribes, facilitando la auditoría de pedidos específicos sin necesidad de recargar.

### 2. Estados del Pedido (Trazabilidad Completa)
Cada pedido pasa por un ciclo de vida con fechas de registro automáticas:
1. **Solicitado:** Se registra la fecha y hora de la creación del pedido.
2. **Preparado:** Momento en el que el centro de producción o fábrica completó el armado.
3. **Despachado:** Cuando la mercadería sale en tránsito.
4. **Entregado:** Cuando la sucursal de destino confirma la recepción.

*(Nota: Los estados cuentan con colores o "badges" visuales para identificar cuellos de botella de un vistazo).*

### 3. Marcador de Eventos Especiales
* Si un pedido es destinado a un Evento, aparece un **marcador destacado (Badge: Evento)** junto al ID. Esto permite a los auditores diferenciar rápidamente la mercadería destinada a ventas diarias de la mercadería para eventos especiales.

### 4. Vista de Detalles (Modal)
* Al hacer clic sobre cualquier fila de la tabla, se abre una vista detallada (Order Detail) que desglosa exactamente qué insumos y productos componen ese pedido.

---

🖼️ **[INSERTAR IMAGEN DEL PANEL DE FLUJO AQUÍ]**

💡 **Tip de Auditoría:** Utiliza esta pantalla al final del día para verificar que no queden pedidos en estado "Despachado" sin marcar como "Entregado".`,

  '02_Catalogo_Productos.md': `# 📦 2. Catálogo de Productos y Suministros

## 🎯 Objetivo Principal
Administrar centralizadamente todo el catálogo de productos a la venta, insumos y materias primas, controlando categorías, formatos, proveedores vinculados y su disponibilidad.

---

## ⚙️ Funcionalidades Detalladas

### 1. ABM Completo (Alta, Baja y Modificación)
* **Creación Rápida:** Botón central para dar de alta nuevos sabores de helado, piezas de pastelería, o insumos.
* **Campos Principales:** Nombre, Categoría, Tipo/Formato, Unidad de Medida (Peso o Unidad), y Proveedor.

### 2. Sistema Avanzado de Filtros y Búsqueda
* **Sub-Pestañas por Categoría:** Filtrado rápido entre *Helados, Pastelería Helada, Pastelería Clásica, Viennoiserie, Térmicos y Otros*.
* **Filtros por Formato:** En el caso de "Helados", permite filtrar por formato físico: *Vasquetas (5-6k) o Baldes (4k/8k)*.
* **Filtros por Proveedor y Estado:** Para revisar qué insumos provee una empresa específica, o revisar únicamente productos inactivos.

### 3. Asignación Ágil de Proveedores
* Al crear o editar un producto, puedes asignarle un proveedor del listado.
* **Creación 'In-Place':** Si el proveedor no existe, puedes hacer clic en el botón [➕] junto al selector para crearlo directamente sin salir del formulario del producto.

### 4. Gestión de Estados (Activo/Inactivo)
* En lugar de borrar productos (lo cual rompería el histórico de ventas), el sistema utiliza "Desactivación" (Soft-delete). Un producto inactivo ya no aparece en el stock ni en los pedidos, pero se mantiene en la base de datos para proyecciones históricas.

---

🖼️ **[INSERTAR IMAGEN DEL CATÁLOGO AQUÍ]**
🖼️ **[INSERTAR IMAGEN DEL FORMULARIO DE CREACIÓN AQUÍ]**

💡 **Tip de Gestión:** Mantén estandarizados los nombres (Ej. "Vasqueta - Sabayón") para que el buscador funcione de manera más intuitiva.`,

  '03_Armado_Pedidos.md': `# 🛒 3. Armado y Preparación de Pedidos

## 🎯 Objetivo Principal
Crear y despachar pedidos desde la Fábrica Central hacia cualquier sucursal o depósito. Esta acción descuenta automáticamente el stock de la fábrica.

---

## ⚙️ Funcionalidades Detalladas

### 1. Selección de Destino
* Selector que incluye todas las sucursales habilitadas y depósitos (incluyendo choferes/camiones en tránsito si aplica).
* **Restricción de Fábrica:** El sistema previene que la Fábrica se haga un pedido a sí misma por error.

### 2. Calculadora de Unidades Integrada
* En la lista de productos, cada fila cuenta con un selector de cantidad.
* Permite ver el **Stock Actual en Fábrica** y el **Stock Actual en Destino** uno al lado del otro. Esto ayuda al armador a tomar decisiones (Ej. "La sucursal ya tiene 10 baldes, no hace falta mandarle más").

### 3. Alertas de Exceso de Stock
* Si ingresas una cantidad a enviar mayor al stock que la Fábrica tiene disponible, el sistema despliega una alerta visual roja (⚠️ *Excede stock disponible*).
* Aún así permite el envío en caso de ajustes manuales inminentes, pero advierte del desfase operativo.

### 4. Filtros Específicos para Armadores
* Para facilitar el armado en cámaras de frío, el panel filtra por Categorías (Helados, Pastelería, etc.) y también por Grupo de Sabores (Cremas, Dulces de leche, Frutales, etc.).
* Al seleccionar "Helados", permite separar por Vasquetas o Baldes, facilitando la preparación física de los pallets.

### 5. Resumen Dinámico del Pedido
* A medida que agregas cantidades, se forma un "Ticket Resumen" en la parte inferior de la pantalla, mostrando el total de ítems distintos agregados antes de confirmar.
* **Botón "Limpiar Todo":** Permite reiniciar el pedido en caso de error.

---

🖼️ **[INSERTAR IMAGEN DE LA PANTALLA DE ARMADO DE PEDIDOS AQUÍ]**

💡 **Tip Logístico:** Si usas una tablet en la cámara de frío, filtra por "Baldes" primero, carga todo en el carrito, y luego pasa a la pestaña "Vasquetas".`,

  '04_Ordenes_Produccion.md': `# 🏭 4. Órdenes de Producción (Eventos y Fábrica)

## 🎯 Objetivo Principal
Coordinar y comunicar las necesidades de elaboración desde la administración hacia las diferentes áreas de producción (Heladero, Pastelero, etc.).

---

## ⚙️ Funcionalidades Detalladas

### 1. Creación Multicomponente
* Una orden de producción agrupa varios ítems a fabricar.
* **Destino de Producción:** Puedes dirigir la orden al área correspondiente (Ej. *Heladero, Pastelería Clásica, Pastelería Helada*). Al cambiar el área, la lista de productos disponibles se filtra automáticamente para mostrar solo lo que esa área puede fabricar.

### 2. Información Crítica
* **Fecha Requerida:** Define el deadline para la producción.
* **Notas/Descripción:** Campo de texto libre para indicar detalles (Ej. "Evento Municipalidad Sábado - Entregar antes del mediodía").

### 3. Flujo y Estados de Producción
* Las órdenes nacen como **Pendientes**. 
* Luego pasan a **En Proceso** (cuando el equipo de cocina empieza a trabajar en ellas).
* Finalmente pasan a **Completadas**. (Las transiciones de estado tienen identificadores visuales de colores: Naranja para En proceso, Verde para Completado).

### 4. Detalle de Producción vs Solicitado
* El panel muestra en tiempo real un comparativo de lo producido versus lo solicitado.
* Formato visible: *Producto X: Cantidad Producida / Cantidad Solicitada (Ej. 5 / 10)*.

---

🖼️ **[INSERTAR IMAGEN DEL TABLERO DE ÓRDENES AQUÍ]**
🖼️ **[INSERTAR IMAGEN DEL FORMULARIO DE NUEVA ORDEN AQUÍ]**

💡 **Tip de Organización:** Usa el campo "Notas" para agregar especificaciones de envasado o decoraciones personalizadas si la orden es para un evento privado.`,

  '05_Control_Stock.md': `# 🏢 5. Control de Stock General y Matriz de Inventario

## 🎯 Objetivo Principal
Monitorear los niveles de inventario en tiempo real de cada sabor y producto en todas las locaciones físicas de Biscui a través de una matriz cruzada (Producto vs Sucursal).

---

## ⚙️ Funcionalidades Detalladas

### 1. Vista de Matriz Cruzada (Grid View)
* El inventario no se muestra en una lista simple, sino en una **Matriz**.
* **Eje Y (Filas):** Productos y sabores.
* **Eje X (Columnas):** Todas las sucursales y la fábrica.
* Esto permite responder al instante: *"¿Cuántas vasquetas de frutilla tenemos en total sumando todas las sucursales?"*

### 2. Separación de Stock: Común vs Eventos
* **Switch Superior:** Permite alternar entre el stock de venta regular (Stock Común) y el inventario reservado específicamente para catering o eventos (Stock de Eventos).
* Evita que el equipo de ventas ofrezca productos que ya están comprometidos.

### 3. Indicadores de Salud de Inventario (Semáforo)
* **Celdas en Rojo/Naranja:** Indican niveles de stock bajos (Menor a 5 unidades).
* **Celdas Vacías/Grisadas:** Indican quiebre de stock (0 unidades).
* **Celdas en Verde:** Indican stock saludable.

### 4. Filtros Combinados de Búsqueda
* Subdivisión por categorías y formatos (Igual que en el armado de pedidos).
* **Filtros por Familia de Sabores:** Para la categoría Helados, se puede filtrar rápidamente por "Chocolates", "Cremas", "Al Agua", "Sin Gluten", etc.

### 5. Edición Rápida (Solo Administradores)
* Al hacer clic en cualquier celda de la matriz (intersección Producto-Sucursal), se despliega un modal rápido para modificar la cantidad directamente, ideal para ajustes por mermas o recuentos de auditoría.

### 6. Control de Inventarios Descentralizados (Sucursales)
* **Permisos Dinámicos:** El administrador puede habilitar o bloquear el ingreso de inventario para una sucursal específica usando el botón **"🔓 Habilitar Inv."** / **"🔒 Bloquear Inv."** ubicado debajo del nombre de la sucursal en la matriz.
* **Bloqueo Automático:** Una vez que la sucursal envía ("Guarda") su recuento de inventario físico, el sistema bloquea automáticamente el permiso, garantizando la seguridad de los datos y evitando modificaciones posteriores no autorizadas.
* **Actualización en Tiempo Real:** Al enviar el inventario, la sucursal actualiza el stock directamente en la base de datos, reflejándose al instante en la matriz del administrador.

---

🖼️ **[INSERTAR IMAGEN DE LA MATRIZ DE STOCK AQUÍ]**

💡 **Tip de Control:** Programa un recuento semanal usando el filtro "Celdas en Rojo" para evitar quiebres de stock en sabores de alta rotación en pleno fin de semana.`,

  '06_Otros_Modulos.md': `# 🧩 6. Módulos Restantes (Logística, Proveedores, Mantenimiento, etc.)

## 🚛 Centro Logístico (Logistics Hub)
Gestiona la flota y los viajes de los choferes. Permite consolidar múltiples pedidos de diferentes sucursales en un solo viaje (Hoja de Ruta) para optimizar recorridos.
🖼️ **[INSERTAR IMAGEN LOGÍSTICA AQUÍ]**

## 🤝 Proveedores
Directorio y ABM de las empresas y contactos que suministran materia prima.
* **Vinculación:** Conecta un producto directamente con la empresa que lo distribuye.
🖼️ **[INSERTAR IMAGEN PROVEEDORES AQUÍ]**

## 🔧 Mantenimiento de Equipos
Control del ciclo de vida de la maquinaria.
* **Inventario Técnico:** Alta de equipos (Heladeras, Exibidoras, Batidoras) con número de serie y asignación a una sucursal específica.
* **Alertas y Semáforos:** Control de mantenimientos preventivos. Genera alertas de *"Próximo"* (Amarillo) o *"Vencido"* (Rojo) para reparaciones programadas.
* **Histórico de Costos:** Seguimiento de reparaciones, detalles de repuestos cambiados y costos asociados.
🖼️ **[INSERTAR IMAGEN MANTENIMIENTO AQUÍ]**

## 📈 Proyecciones
Herramienta analítica que evalúa consumos históricos para sugerir cantidades de producción necesarias para la próxima semana o mes, minimizando el desperdicio.
🖼️ **[INSERTAR IMAGEN PROYECCIONES AQUÍ]**

## 🔍 Auditoría de Consumo y Discrepancias
Módulos de seguridad financiera.
* Registra inconsistencias en los arqueos de caja o recuentos de inventario detectados en los cierres de turno de cada local.
🖼️ **[INSERTAR IMAGEN AUDITORÍA AQUÍ]**

## 📜 Histórico
Archivo inmutable de cierres de caja antiguos y logs del sistema. Permite a la gerencia auditar movimientos pasados y analizar la evolución de las ventas.
🖼️ **[INSERTAR IMAGEN HISTÓRICO AQUÍ]**
`
};

for (const [filename, content] of Object.entries(manuals)) {
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}
console.log('Archivos generados.');
