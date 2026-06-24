# 🏭 4. Órdenes de Producción (Eventos y Fábrica)

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

💡 **Tip de Organización:** Usa el campo "Notas" para agregar especificaciones de envasado o decoraciones personalizadas si la orden es para un evento privado.