# 📊 1. Flujo y Auditoría de Pedidos (Flujo de Caja)

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

💡 **Tip de Auditoría:** Utiliza esta pantalla al final del día para verificar que no queden pedidos en estado "Despachado" sin marcar como "Entregado".