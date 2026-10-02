const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/context/DataContext.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetBlock = `    for (const item of selectedPedido.items) {
      const pId = item.producto_id;
      const requestedQty = item.cantidad_solicitada;
      const qtyPrimary = (targetEsEvento ? eventStockMap[pId] : commonStockMap[pId]) ?? 0;
      const qtySecondary = (targetEsEvento ? commonStockMap[pId] : eventStockMap[pId]) ?? 0;
      if (qtyPrimary >= requestedQty) {
        continue;
      }`;

const newBlock = `    for (const item of selectedPedido.items) {
      const pId = item.producto_id;
      const prod = productos.find(p => p.id === pId);
      
      // No descontar stock de fabrica al preparar si es helado,
      // porque el helado se descuenta en kilos reales cuando la sucursal confirma la recepcion.
      if (prod && prod.categoria === 'helados') {
        continue;
      }

      const requestedQty = item.cantidad_solicitada;
      const qtyPrimary = (targetEsEvento ? eventStockMap[pId] : commonStockMap[pId]) ?? 0;
      const qtySecondary = (targetEsEvento ? commonStockMap[pId] : eventStockMap[pId]) ?? 0;
      if (qtyPrimary >= requestedQty) {
        continue;
      }`;

if(content.includes(targetBlock)) {
    content = content.replace(targetBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log('Skipped helados in handlePrepareOrder');
} else {
    console.log('Block not found');
}
