import { useData } from '../../context/DataContext';
import React from 'react';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const TransportStockView = () => {
  const {
    productos,
    user,
    stockData,
    formatTipo,
    proveedores,
    formatQuantity
  } = useData();
  return <div className="glass-card fade-in">
                <h3 className="section-title">📦 Stock Actual de Insumos en Fábrica</h3>
                <p style={{
      fontSize: '0.8rem',
      color: 'var(--text-light)',
      marginBottom: '1.2rem'
    }}>
                  Consulta el inventario actual de insumos y materias primas en la fábrica.
                </p>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Insumo / Producto</th>
                        <th>Proveedor</th>
                        <th style={{
              textAlign: 'center'
            }}>Stock en Fábrica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.filter(p => p.activo === 1).filter(p => user.rol !== 'transportista' || p.categoria === 'termicos' || p.categoria === 'otros').sort((a, b) => a.nombre.localeCompare(b.nombre)).map(prod => {
            const stock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 1 && !s.es_evento)?.cantidad || 0;
            return <tr key={prod.id}>
                              <td><strong>{prod.nombre}</strong> <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-light)'
                }}>({formatTipo(prod.tipo)})</span></td>
                              <td>{proveedores.find(prov => prov.id === prod.proveedor_id)?.nombre || '-'}</td>
                              <td style={{
                textAlign: 'center'
              }}>
                                <span className={stock > 0 ? 'matrix-cell-ok' : 'matrix-cell-empty'} style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-block',
                  minWidth: '60px'
                }}>
                                  {formatQuantity(stock, prod)}
                                </span>
                              </td>
                            </tr>;
          })}
                      {productos.filter(p => p.activo === 1).length === 0 && <tr>
                          <td colSpan="3" style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '2rem 1rem'
            }}>No hay productos registrados.</td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>;
};
export default TransportStockView;