# 🏢 5. Control de Stock General y Matriz de Inventario

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

---

🖼️ **[INSERTAR IMAGEN DE LA MATRIZ DE STOCK AQUÍ]**

💡 **Tip de Control:** Programa un recuento semanal usando el filtro "Celdas en Rojo" para evitar quiebres de stock en sabores de alta rotación en pleno fin de semana.