# 🛒 3. Armado y Preparación de Pedidos

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

💡 **Tip Logístico:** Si usas una tablet en la cámara de frío, filtra por "Baldes" primero, carga todo en el carrito, y luego pasa a la pestaña "Vasquetas".