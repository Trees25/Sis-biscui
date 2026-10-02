const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/components/modals/OrderDetailModal.jsx';
let content = fs.readFileSync(file, 'utf8');
const startIndex = content.indexOf('                  <thead>');
const endIndex = content.indexOf('                  </tbody>') + 26;
if (startIndex === -1 || endIndex < 26) {
    console.error('Could not find block');
    process.exit(1);
}
const oldBlock = content.substring(startIndex, endIndex);
const newBlock = `                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '90px' }}>Cant. Pedida</th>
                      <th>Producto / Sabor</th>
                      <th style={{ textAlign: 'center', width: '160px' }}>Peso Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.items.map(it => {
                      const prod = productos.find(p => p.id === it.producto_id);
                      const isHelado = prod?.categoria === 'helados';
                      const qtyRequestedLabel = isHelado ? it.cantidad_solicitada : formatQuantityShort(it.cantidad_solicitada, prod);

                      return (
                        <tr key={it.producto_id}>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{qtyRequestedLabel}</td>
                          <td><strong>{it.producto_nombre}</strong></td>
                          <td style={{ textAlign: 'center' }}>
                            {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? (
                              formatQuantityShort(it.cantidad_recibida, prod)
                            ) : (
                              <UnitCalculatorInput 
                                value={receiveItems[it.producto_id] !== undefined ? receiveItems[it.producto_id] : ''} 
                                onChange={val => {
                                  setReceiveItems(prev => ({
                                    ...prev,
                                    [it.producto_id]: val
                                  }));
                                }} 
                                product={prod} 
                                placeholder={isHelado ? "Ej: 4200 (gr)" : "Recibido"} 
                                min={0} 
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>`;
content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content);
console.log('Replaced successfully');
