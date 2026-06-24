# 📦 2. Catálogo de Productos y Suministros

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

💡 **Tip de Gestión:** Mantén estandarizados los nombres (Ej. "Vasqueta - Sabayón") para que el buscador funcione de manera más intuitiva.