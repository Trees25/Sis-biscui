const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/context/DataContext.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `      if (isHelado && origDetail && selectedPedido.estado !== 'solicitado') {`;
const endStr = `        }\n      }\n    }`;

const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
    const endIndex = content.indexOf(endStr, startIndex) + endStr.length - 6; // up to just before the loop closes
    
    const block = content.substring(startIndex, endIndex);
    const replacement = `      // Restar siempre el peso real recibido (kilos) del stock de la fábrica
      if (isHelado) {
        const kilosARestar = item.cantidad_recibida;
        if (kilosARestar > 0) {
          const { data: fStock } = await supabase.from('stock_sucursales')
            .select('cantidad')
            .eq('sucursal_id', 1)
            .eq('producto_id', prod.id)
            .eq('es_evento', selectedPedido.es_evento)
            .single();
          if (fStock) {
            await supabase.from('stock_sucursales').update({
              cantidad: Number(fStock.cantidad) - Number(kilosARestar)
            }).eq('sucursal_id', 1).eq('producto_id', prod.id).eq('es_evento', selectedPedido.es_evento);
          }
        }
      }`;

    content = content.replace(block, replacement);
    fs.writeFileSync(file, content);
    console.log('Successfully replaced logic');
} else {
    console.log('Could not find start string');
}
