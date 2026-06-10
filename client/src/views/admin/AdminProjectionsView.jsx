import { useData } from '../../context/DataContext';
import React from 'react';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const AdminProjectionsView = () => {
  const {
    prodReqSearch,
    setProdReqSearch,
    dashboardStats,
    recentLotes,
    getTareByTipo,
    formatTipo,
    formatQuantity
  } = useData();
  return <div>
                <div className="glass-card" style={{
      marginBottom: '1.5rem'
    }}>
                  <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.2rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '0.8rem'
      }}>
                    <div>
                      <h3 className="section-title" style={{
            margin: 0,
            border: 'none'
          }}>Sugerencias de Fabricación (Demanda vs Stock Fábrica)</h3>
                      <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            marginTop: '0.25rem',
            marginBottom: 0
          }}>
                        Flujo de planificación inteligente: sabores solicitados por sucursales en pedidos activos que superan el stock actual en fábrica.
                      </p>
                    </div>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
                      <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)'
          }}>Buscar:</span>
                      <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar producto..." value={prodReqSearch} onChange={e => setProdReqSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto / Sabor</th>
                          <th>Tipo</th>
                          <th>Pendiente de Entrega</th>
                          <th>Stock Fábrica Actual</th>
                          <th>Diferencia a Fabricar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
              let items = dashboardStats?.productionNeeded || [];
              if (prodReqSearch) {
                items = items.filter(prod => prod.producto_nombre.toLowerCase().includes(prodReqSearch.toLowerCase()) || prod.tipo && prod.tipo.toLowerCase().includes(prodReqSearch.toLowerCase()));
              }
              return items.map(prod => <tr key={prod.producto_id}>
                              <td><strong>{prod.producto_nombre}</strong></td>
                              <td style={{
                  textTransform: 'capitalize'
                }}>{prod.tipo}</td>
                              <td style={{
                  fontWeight: 600
                }}>{prod.cantidad_pendiente}</td>
                              <td>{prod.stock_fabrica || 0}</td>
                              <td style={{
                  color: 'var(--danger)',
                  fontWeight: 700
                }}>
                                {Math.max(0, prod.cantidad_pendiente - (prod.stock_fabrica || 0))}
                              </td>
                            </tr>);
            })()}
                        {(!dashboardStats?.productionNeeded || dashboardStats.productionNeeded.length === 0) && <tr>
                            <td colSpan="5" style={{
                textAlign: 'center',
                color: 'var(--success)',
                fontWeight: 600
              }}>
                              El stock en Fábrica es suficiente para cubrir todos los pedidos activos.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Historial de Fabricación Reciente (Lotes y Pesos)</h3>
                  <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        marginBottom: '1.2rem'
      }}>
                    Historial de lotes producidos por el personal de fábrica, incluyendo los pesos brutos y netos registrados para helados.
                  </p>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Formato / Tipo</th>
                          <th>Unidades</th>
                          <th>Pesos de Unidades (Bruto)</th>
                          <th>Peso Neto Total</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes.map(l => {
              const isHelado = l.productos?.categoria === 'helados';
              const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
              const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;
              return <tr key={l.id}>
                              <td><code style={{
                    background: 'rgba(0,0,0,0.05)',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>{l.codigo_lote}</code></td>
                              <td><strong>{l.productos?.nombre}</strong></td>
                              <td style={{
                  textTransform: 'capitalize',
                  fontSize: '0.85rem'
                }}>{formatTipo(l.productos?.tipo)}</td>
                              <td><strong>{formatQuantity(l.cantidad, l.productos)}</strong></td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? <span style={{
                    fontSize: '0.85rem'
                  }}>
                                    {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                  </span> : <span style={{
                    color: 'var(--text-light)',
                    fontSize: '0.85rem'
                  }}>-</span>}
                              </td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? <strong style={{
                    color: 'var(--success)'
                  }}>{netKilos.toFixed(2)} kg</strong> : <span style={{
                    color: 'var(--text-light)',
                    fontSize: '0.85rem'
                  }}>-</span>}
                              </td>
                              <td style={{
                  fontSize: '0.85rem'
                }}>{new Date(l.fecha_produccion).toLocaleString()}</td>
                            </tr>;
            })}
                        {recentLotes.length === 0 && <tr>
                            <td colSpan="7" style={{
                textAlign: 'center',
                color: 'var(--text-light)'
              }}>
                              No hay lotes de producción registrados.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>;
};
export default AdminProjectionsView;