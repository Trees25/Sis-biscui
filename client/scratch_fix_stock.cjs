const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/context/DataContext.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `      if (isHelado && origDetail && selectedPedido.estado !== 'solicitado') {
        const unidadesRestadas = loadedQty; 
        const diferenciaARestar = item.cantidad_recibida - unidadesRestadas;
        if (diferenciaARestar !== 0) {
          const { data: fStock } = await supabase.from('stock_sucursales')
            .select('cantidad')
            .eq('sucursal_id', 1)
            .eq('producto_id', prod.id)
            .eq('es_evento', selectedPedido.es_evento)
            .single();
          if (fStock) {
            await supabase.from('stock_sucursales').update({
              cantidad: fStock.cantidad - diferenciaARestar
            }).eq('sucursal_id', 1).eq('producto_id', prod.id).eq('es_evento', selectedPedido.es_evento);
          }
        }
      }`;

const replacementStr = `      // Restar siempre el peso real recibido (kilos) del stock de la fábrica
      if (isHelado) {
        // En fábrica, el stock está en kilos (o queremos restarlo en kilos)
        // La sucursal carga el peso total en item.cantidad_recibida
        const kilosARestar = item.cantidad_recibida;
        if (kilosARestar > 0) {
          const { data: fStock } = await supabase.from('stock_sucursales')
            .select('cantidad')
            .eq('sucursal_id', 1)
            .eq('producto_id', prod.id)
            .eq('es_evento', selectedPedido.es_evento)
            .single();
          if (fStock) {
            // Nota: Si el stock de fabrica estaba restando unidades en la preparación, 
            // esto deberia compensarlo. Pero si se saltea la preparación, simplemente resta los kilos.
            // Para simplificar, restamos directamente los kilos ingresados por la sucursal del stock central.
            await supabase.from('stock_sucursales').update({
              cantidad: fStock.cantidad - kilosARestar
            }).eq('sucursal_id', 1).eq('producto_id', prod.id).eq('es_evento', selectedPedido.es_evento);
          }
        }
      }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Fixed factory stock deduction');
