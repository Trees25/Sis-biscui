const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/components/modals/OrderDetailModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                  </tbody>
                </table>
              </div>`;

const newStr = `                  </tbody>
                </table>
              </div>
              
              {/* Confirm Receipt Button */}
              {selectedPedido.estado !== 'entregado' && selectedPedido.estado !== 'con_discrepancia' && (
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-success" onClick={handleConfirmReceive} disabled={loading} style={{ width: '100%', fontWeight: 600, padding: '0.8rem' }}>
                    Confirmar Recepción y Actualizar Stock
                  </button>
                </div>
              )}`;

content = content.replace(targetStr, newStr);
fs.writeFileSync(file, content);
console.log('Button added successfully');
