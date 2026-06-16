import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const FactoryProductionView = () => {
  const {
    user,
    handleProductionSubmit,
    prodForm,
    productos,
    getProductOptionLabel,
    formatTipo,
    setProdForm,
    setProdWeights,
    prodFormSearch,
    setProdFormSearch,
    isProductVisibleToRole,
    getTareByTipo,
    prodWeights,
    loading,
    recentLotes,
    formatQuantity,
    productionOrders,
    handleAssignEventStock,
    handleCompleteEventOrder,
    stockData,
    showToast
  } = useData();

  const [assignModalData, setAssignModalData] = React.useState(null);
  const [assignQty, setAssignQty] = React.useState('');

  const submitAssign = () => {
    if (!assignModalData) return;
    const parsed = parseInt(assignQty);
    if (isNaN(parsed) || parsed <= 0) {
      showToast('Cantidad inválida', 'error');
    } else if (parsed > assignModalData.availStock) {
      showToast('No hay suficiente stock reservado para eventos', 'error');
    } else {
      handleAssignEventStock(assignModalData.id, assignModalData.producto_id, parsed);
      setAssignModalData(null);
      setAssignQty('');
    }
  };

  return <div>
    {productionOrders && productionOrders.filter(o => o.estado !== 'completada').length > 0 && (
      <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--warning)' }}>
        <h3 className="section-title" style={{ color: 'var(--warning)', marginTop: 0 }}>📋 Órdenes de Producción Pendientes</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha Requerida</th>
                <th>Notas / Evento</th>
                <th>Productos Solicitados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.filter(o => o.estado !== 'completada').map(order => {
                const relevantDetails = order.orden_produccion_detalles?.filter(d => d.productos && isProductVisibleToRole(d.productos, user.rol)) || [];
                if (relevantDetails.length === 0) return null;
                
                // Check if all relevant items are met
                const allMet = relevantDetails.every(d => d.cantidad_producida >= d.cantidad_solicitada);

                return (
                  <tr key={order.id}>
                    <td>{new Date(order.fecha_requerida).toLocaleDateString()}</td>
                    <td>{order.notas} <br/><span className="badge badge-en_transito">{order.estado.toUpperCase()}</span></td>
                    <td>
                      <ul style={{ paddingLeft: '1rem', margin: 0, listStyle: 'none' }}>
                        {relevantDetails.map(d => {
                          const stockItem = stockData?.find(s => s.sucursal_id === 1 && s.es_evento === true && s.producto_id === d.producto_id);
                          const availStock = stockItem ? stockItem.cantidad : 0;
                          return (
                            <li key={d.id} style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ minWidth: '150px' }}><strong>{d.productos.nombre}</strong>: {d.cantidad_producida} / {d.cantidad_solicitada}</span>
                              {d.cantidad_producida < d.cantidad_solicitada && (
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    const needed = d.cantidad_solicitada - d.cantidad_producida;
                                    setAssignModalData({
                                      id: d.id,
                                      producto_id: d.producto_id,
                                      nombre: d.productos.nombre,
                                      availStock,
                                      needed
                                    });
                                    setAssignQty('');
                                  }}
                                >
                                  + Asignar
                                </button>
                              )}
                              {d.cantidad_producida >= d.cantidad_solicitada && (
                                <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Listo</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {allMet ? (
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => {
                            if(window.confirm('¿Confirmar que el pedido está preparado? Esto descontará el stock de eventos.')) {
                              handleCompleteEventOrder(order);
                            }
                          }}
                        >
                          Marcar Preparado
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>En progreso...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}
  
  <div className="dashboard-grid">
                <div className="glass-card">
                  <h3 className="section-title">
                    {user.rol === 'heladero' ? 'Registro de Fabricación' : user.rol === 'pastelero_helado' ? 'Registro de Pastelería Helada' : 'Registro de Pastelería'}
                  </h3>
                  <form onSubmit={handleProductionSubmit}>
                    <div className="form-group" style={{
          position: 'relative'
        }}>
                      <label>Seleccionar Producto / Sabor</label>
                      <input type="hidden" name="producto_id" value={prodForm.producto_id} required />
                      {prodForm.producto_id ? <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.8rem 1rem',
            background: 'hsla(24, 85%, 55%, 0.08)',
            border: '1px solid hsla(24, 85%, 55%, 0.2)',
            borderRadius: '10px',
            marginTop: '0.2rem'
          }}>
                          <div>
                            <span style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                fontWeight: 700,
                display: 'block',
                marginBottom: '2px'
              }}>
                              Producto Seleccionado
                            </span>
                            <span style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-dark)'
              }}>
                              {productos.find(p => p.id === parseInt(prodForm.producto_id)) ? getProductOptionLabel(productos.find(p => p.id === parseInt(prodForm.producto_id))) : 'Cargando...'}
                            </span>
                            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-light)',
                marginLeft: '8px'
              }}>
                              ({productos.find(p => p.id === parseInt(prodForm.producto_id)) ? formatTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo) : ''})
                            </span>
                          </div>
                          <button type="button" className="btn btn-outline btn-sm" style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              borderColor: 'var(--danger)',
              color: 'var(--danger)',
              background: 'transparent'
            }} onClick={() => {
              setProdForm({
                ...prodForm,
                producto_id: ''
              });
              setProdWeights([]);
            }}>
                            Cambiar
                          </button>
                        </div> : <>
                          <input type="text" className="form-control" placeholder="🔍 Buscar producto por nombre..." value={prodFormSearch} onChange={e => setProdFormSearch(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter') e.preventDefault();
            }} style={{
              marginBottom: '0.4rem',
              padding: '0.8rem 1.2rem',
              fontSize: '1.05rem',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              background: 'var(--input-bg)',
              color: 'var(--text-dark)',
              width: '100%'
            }} />
                          {(() => {
              const matchedProducts = productos.filter(p => {
                if (!isProductVisibleToRole(p, user.rol)) return false;
                if (!prodFormSearch) return true;
                const searchLower = prodFormSearch.toLowerCase();
                return p.nombre.toLowerCase().includes(searchLower) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(searchLower);
              });
              return matchedProducts.length > 0 ? <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '10px',
                background: 'white',
                marginTop: '0.2rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                                {matchedProducts.map(p => <div key={p.id} onClick={() => {
                  const isVasqueta = p.categoria === 'helados' && p.tipo === 'vasqueta_5_6k';
                  setProdForm({
                    ...prodForm,
                    producto_id: String(p.id),
                    cantidad: '',
                    es_evento: isVasqueta ? false : prodForm.es_evento
                  });
                  setProdWeights([]);
                  setProdFormSearch('');
                }} style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'background-color 0.2s',
                  fontSize: '0.95rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <div>
                                      <strong style={{
                      color: 'var(--text-dark)'
                    }}>{p.nombre}</strong>
                                      <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-light)',
                      marginLeft: '8px'
                    }}>
                                        ({formatTipo(p.tipo)})
                                      </span>
                                    </div>
                                    <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                                      {p.categoria.replace(/_/g, ' ')}
                                    </span>
                                  </div>)}
                              </div> : <div style={{
                padding: '0.75rem 1rem',
                color: 'var(--text-light)',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                                No se encontraron productos.
                              </div>;
            })()}
                        </>}
                    </div>
                    <div className="form-group">
                      <label>Fecha de Fabricación</label>
                      <input type="date" className="form-control" value={prodForm.fecha} onChange={e => setProdForm({
            ...prodForm,
            fecha: e.target.value
          })} required />
                    </div>

                    {/* Event Checkbox */}
                    {(() => {
          const selectedProd = productos.find(p => p.id === parseInt(prodForm.producto_id));
          if (!selectedProd) return null;
          const isVasqueta = selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
          if (isVasqueta) return null;
          return <div className="form-group" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0.8rem 0'
          }}>
                          <input type="checkbox" id="prodEsEvento" checked={prodForm.es_evento} onChange={e => setProdForm({
              ...prodForm,
              es_evento: e.target.checked
            })} style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }} />
                          <label htmlFor="prodEsEvento" style={{
              margin: 0,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
                            Destinar a Stock de Eventos (Separado del stock inicial)
                          </label>
                        </div>;
        })()}
                    <div className="form-group">
                      <label>Cantidad Fabricada</label>
                      <UnitCalculatorInput value={prodForm.cantidad} onChange={val => {
            setProdForm({
              ...prodForm,
              cantidad: val
            });
            const qty = parseInt(val) || 0;
            setProdWeights(prev => {
              const next = [...prev];
              if (next.length < qty) {
                while (next.length < qty) next.push('');
              } else if (next.length > qty) {
                next.splice(qty);
              }
              return next;
            });
          }} product={productos.find(p => p.id === parseInt(prodForm.producto_id))} placeholder="Ej. 5" min={1} />
                    </div>

                    {/* Weight Inputs for Helado */}
                    {productos.find(p => p.id === parseInt(prodForm.producto_id))?.categoria === 'helados' && parseInt(prodForm.cantidad) > 0 && <div style={{
          marginTop: '1.2rem',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
                        <h4 style={{
            fontSize: '0.9rem',
            marginBottom: '0.8rem',
            color: 'var(--primary)',
            fontWeight: 600
          }}>
                          Pesos Individuales (Balanza)
                        </h4>
                        <div style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-light)'
          }}>
                          Envase: <strong style={{
              color: 'var(--text-dark)'
            }}>{formatTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{
              color: 'var(--text-dark)'
            }}>{getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo).toFixed(3)} kg</strong>
                        </div>
                        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.6rem',
            maxHeight: '200px',
            overflowY: 'auto',
            paddingRight: '0.2rem'
          }}>
                          {prodWeights.map((w, idx) => {
              const tare = getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo);
              const gross = parseFloat(w) || 0;
              const net = Math.max(0, gross - tare);
              return <div key={idx} className="form-group" style={{
                margin: 0
              }}>
                                <label style={{
                  fontSize: '0.75rem',
                  marginBottom: '2px',
                  display: 'block'
                }}># {idx + 1} (Peso Bruto)</label>
                                <input type="number" step="0.001" min="0.001" required className="form-control" style={{
                  padding: '0.3rem',
                  fontSize: '0.85rem'
                }} value={w} onChange={e => {
                  const next = [...prodWeights];
                  next[idx] = e.target.value;
                  setProdWeights(next);
                }} placeholder="kg" />
                                <div style={{
                  fontSize: '0.7rem',
                  color: net > 0 ? 'var(--success)' : 'var(--text-light)',
                  marginTop: '2px',
                  textAlign: 'right'
                }}>
                                  Neto: {net.toFixed(3)} kg
                                </div>
                              </div>;
            })}
                        </div>
                        <div style={{
            marginTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '0.8rem',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
                          <span><strong>Total Bruto:</strong> {prodWeights.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0).toFixed(3)} kg</span>
                          <span><strong>Total Neto:</strong> {prodWeights.reduce((acc, curr) => acc + Math.max(0, (parseFloat(curr) || 0) - getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)), 0).toFixed(3)} kg</span>
                        </div>
                      </div>}

                    <button type="submit" className="btn btn-primary" style={{
          marginTop: '1rem',
          width: '100%'
        }} disabled={loading}>
                      Registrar Entrada y Auto-Lote
                    </button>
                  </form>
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Producción Reciente (Lotes)</h3>
                  <div className="table-container" style={{
        maxHeight: '420px',
        overflowY: 'auto'
      }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Cant.</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes.filter(l => l.productos && isProductVisibleToRole(l.productos, user.rol)).map(l => {
              const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
              const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;
              return <tr key={l.id}>
                                <td><code style={{
                    background: 'rgba(0,0,0,0.05)',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>{l.codigo_lote}</code></td>
                                <td>
                                  <strong>{l.productos?.nombre}</strong>
                                  {l.pesos && l.pesos.length > 0 && <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-light)',
                    marginTop: '2px'
                  }}>
                                      Pesos: {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                      <br />
                                      Neto total: <strong style={{
                      color: 'var(--success)'
                    }}>{netKilos.toFixed(2)} kg</strong>
                                    </div>}
                                </td>
                                <td><strong>{formatQuantity(l.cantidad, l.productos)}</strong></td>
                                <td style={{
                  fontSize: '0.8rem'
                }}>{new Date(l.fecha_produccion).toLocaleDateString()}</td>
                              </tr>;
            })}
                        {recentLotes.filter(l => l.productos && isProductVisibleToRole(l.productos, user.rol)).length === 0 && <tr>
                            <td colSpan="4" style={{
                textAlign: 'center',
                color: 'var(--text-light)'
              }}>
                              No hay producciones registradas recientemente.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

      {assignModalData && (
        <div className="modal-overlay">
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', margin: 'auto' }}>
            <h4 style={{ marginTop: 0, color: 'var(--primary)', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>Asignar Stock de Eventos</h4>
            <div style={{ margin: '1rem 0', fontSize: '0.9rem' }}>
              <p><strong>Producto:</strong> {assignModalData.nombre}</p>
              <p><strong>Stock en cámara (Eventos):</strong> {assignModalData.availStock}</p>
              <p><strong>Faltan en el pedido:</strong> {assignModalData.needed}</p>
            </div>
            <div className="form-group">
              <label>Cantidad a asignar</label>
              <input 
                type="number" 
                min="1" 
                max={Math.min(assignModalData.availStock, assignModalData.needed)}
                className="form-control"
                value={assignQty}
                onChange={(e) => setAssignQty(e.target.value)}
                placeholder="Ej. 2"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => { setAssignModalData(null); setAssignQty(''); }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={submitAssign} disabled={!assignQty || isNaN(parseInt(assignQty)) || parseInt(assignQty) <= 0}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>;
};
export default FactoryProductionView;