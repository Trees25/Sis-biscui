const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/components/modals/OrderDetailModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<UnitCalculatorInput 
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
                              />`;

const replacement = `<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                              {!isHelado && (receiveItems[it.producto_id] ?? it.cantidad_solicitada) !== it.cantidad_solicitada && (
                                <input type="text" className="form-control" placeholder="Motivo de dif." style={{ fontSize: '0.8rem', padding: '0.4rem' }} value={receiveReasons[it.producto_id] || ''} onChange={e => setReceiveReasons(prev => ({ ...prev, [it.producto_id]: e.target.value }))} required />
                              )}
                            </div>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync(file, content);
console.log('Replaced reason input successfully');
