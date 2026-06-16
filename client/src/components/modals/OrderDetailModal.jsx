import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../common/UnitCalculatorInput';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const OrderDetailModal = () => {
  const {
    selectedPedido,
    setSelectedPedido,
    setPrepareStockSource,
    getBadgeClass,
    translateState,
    productos,
    formatQuantityShort,
    user,
    prepareStockSource,
    handlePrepareOrder,
    loading,
    loadItems,
    setLoadItems,
    formatTipo,
    formatQuantity,
    product,
    handleConfirmLoad,
    setShowLossModal,
    handleMarkDelivered,
    receiveItems,
    setReceiveItems,
    receiveReasons,
    setReceiveReasons,
    handleConfirmReceive
  } = useData();
  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem',
    overflowY: 'auto'
  }}>
            <div className="glass-card" style={{
      maxWidth: '640px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
              <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
                <h2 style={{
          margin: 0
        }}>Pedido #{selectedPedido.id}</h2>
                <button className="btn btn-outline btn-sm" onClick={() => {
          setSelectedPedido(null);
          setPrepareStockSource('evento');
        }}>Cerrar</button>
              </div>

              <div style={{
        marginBottom: '1.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-light)'
      }}>
                <div>
                  <strong>Destino:</strong> {selectedPedido.destino_nombre}<br />
                  <strong>Estado:</strong> <span className={getBadgeClass(selectedPedido.estado)}>{translateState(selectedPedido.estado)}</span>
                </div>
                <div>
                  <strong>Solicitado por:</strong> {selectedPedido.creado_por_nombre || 'N/D'}<br />
                  <strong>Fecha:</strong> {new Date(selectedPedido.created_at).toLocaleString()}
                </div>
              </div>

              {/* Items Table */}
              <div className="table-container" style={{
        marginBottom: '1.5rem'
      }}>
                <table>
                  <thead>
                    <tr>
                      <th>Producto / Sabor</th>
                      <th style={{
                textAlign: 'center'
              }}>Solicitado</th>
                      {selectedPedido.estado !== 'solicitado' && <th style={{
                textAlign: 'center'
              }}>Preparado</th>}
                      {selectedPedido.estado !== 'solicitado' && selectedPedido.estado !== 'preparado' && <th style={{
                textAlign: 'center'
              }}>Cargado</th>}
                      {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? <th style={{
                textAlign: 'center'
              }}>Recibido</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.items.map(it => {
              const prod = productos.find(p => p.id === it.producto_id);
              return <tr key={it.producto_id}>
                          <td><strong>{it.producto_nombre}</strong></td>
                          <td style={{
                  textAlign: 'center'
                }}>{formatQuantityShort(it.cantidad_solicitada, prod)}</td>
                          {selectedPedido.estado !== 'solicitado' && <td style={{
                  textAlign: 'center'
                }}>{formatQuantityShort(it.cantidad_preparada, prod)}</td>}
                          {selectedPedido.estado !== 'solicitado' && selectedPedido.estado !== 'preparado' && <td style={{
                  textAlign: 'center'
                }}>{formatQuantityShort(it.cantidad_cargada, prod)}</td>}
                          {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? <td style={{
                  textAlign: 'center'
                }}>{formatQuantityShort(it.cantidad_recibida, prod)}</td> : null}
                        </tr>;
            })}
                  </tbody>
                </table>
              </div>

              {/* ACTION: PREPARE ORDER (Transportista / Heladero for event orders) */}
              {(user.rol === 'transportista' || user.rol === 'heladero' && selectedPedido.es_evento) && selectedPedido.estado === 'solicitado' && <div>
                  {selectedPedido.es_evento && <div style={{
          marginBottom: '1.2rem',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
                      <label style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            display: 'block',
            marginBottom: '0.5rem'
          }}>
                        📦 Seleccionar Origen del Stock para Descontar:
                      </label>
                      <select className="form-control" value={prepareStockSource} onChange={e => setPrepareStockSource(e.target.value)} style={{
            background: 'var(--input-bg)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: 'var(--text-dark)',
            borderRadius: '8px',
            padding: '0.55rem',
            fontSize: '0.9rem',
            width: '100%',
            fontWeight: 600
          }}>
                        <option value="evento">🎉 Stock de Eventos (Fabricación para eventos)</option>
                        <option value="comun">📦 Stock Común / Regular (Sucursales)</option>
                      </select>
                    </div>}
                  <div className="warning-banner">
                    💡 Al presionar "Confirmar Preparación", se descontará la cantidad del stock en fábrica y quedará listo para ser cargado y enviado.
                  </div>
                  <button className="btn btn-success" onClick={handlePrepareOrder} disabled={loading} style={{
          width: '100%'
        }}>
                    Confirmar Preparación de Pedido
                  </button>
                </div>}

              {/* ACTION: LOAD TRUCK (Transportista) */}
              {user.rol === 'transportista' && selectedPedido.estado === 'preparado' && <div>
                  <h4 style={{
          marginBottom: '0.75rem'
        }}>Verificar Carga Física en Vehículo</h4>
                  <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-light)',
          marginBottom: '1rem'
        }}>
                    Indica cuáles productos están disponibles. Si llevas menos de lo preparado o nada, la diferencia quedará pendiente para la sucursal y volverá al stock de fábrica.
                  </p>

                  <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
                    {selectedPedido.items.map(it => {
            const isAvailable = (loadItems[it.producto_id] ?? it.cantidad_preparada) > 0;
            const loadedQty = loadItems[it.producto_id] ?? it.cantidad_preparada;
            const pendingQty = Math.max(0, it.cantidad_solicitada - loadedQty);
            return <div key={it.producto_id} className="glass-card" style={{
              padding: '1rem',
              borderRadius: '12px',
              background: isAvailable ? 'rgba(46, 213, 115, 0.05)' : 'rgba(255, 71, 87, 0.05)',
              border: isAvailable ? '1px solid rgba(46, 213, 115, 0.3)' : '1px solid rgba(255, 71, 87, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}>
                          <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                            <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }} onClick={() => {
                  setLoadItems(prev => ({
                    ...prev,
                    [it.producto_id]: isAvailable ? 0 : it.cantidad_preparada
                  }));
                }}>
                              <input type="checkbox" checked={isAvailable} readOnly style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--success)',
                    cursor: 'pointer'
                  }} />
                              <div>
                                <strong style={{
                      fontSize: '0.95rem'
                    }}>{it.producto_nombre}</strong>
                                <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-light)',
                      textTransform: 'capitalize'
                    }}>{formatTipo(it.tipo)}</div>
                              </div>
                            </div>
                            <div>
                              <span className={`badge ${isAvailable ? 'badge-activo' : 'badge-inactivo'}`} style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem'
                  }}>
                                {isAvailable ? '✓ Disponible' : '✗ Sin Stock'}
                              </span>
                            </div>
                          </div>

                          <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px'
              }}>
                            <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-light)'
                }}>
                              <div>Pedido Original: <strong>{formatQuantity(it.cantidad_solicitada, productos.find(p => p.id === it.producto_id))}</strong></div>
                              <div style={{
                    marginTop: '2px'
                  }}>Preparado en Fábrica: <strong>{formatQuantity(it.cantidad_preparada, productos.find(p => p.id === it.producto_id))}</strong></div>
                            </div>
                            <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.4rem'
                }}>
                              {isAvailable ? <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                                  <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-light)'
                    }}>Cargar:</span>
                                  <div style={{
                      width: '130px'
                    }}>
                                    <UnitCalculatorInput value={loadedQty} onChange={val => {
                        const clampedVal = Math.min(it.cantidad_preparada, val);
                        setLoadItems(prev => ({
                          ...prev,
                          [it.producto_id]: clampedVal
                        }));
                      }} product={productos.find(p => p.id === it.producto_id)} placeholder="Cargar" min={1} />
                                  </div>
                                </div> : <div style={{
                    fontWeight: 600,
                    color: 'var(--danger)',
                    fontSize: '0.85rem'
                  }}>
                                  No se carga (0 u.)
                                </div>}
                              {pendingQty > 0 && <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--warning)',
                    fontWeight: 600
                  }}>
                                  ⚠️ Quedarán {formatQuantity(pendingQty, product)} pendientes
                                </div>}
                            </div>
                          </div>
                        </div>;
          })}
                  </div>

                  <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
                    <button className="btn btn-outline" onClick={() => setSelectedPedido(null)} style={{
            flex: 1
          }}>
                      ✕ Volver a Pedidos
                    </button>
                    <button className="btn btn-secondary" onClick={handleConfirmLoad} disabled={loading} style={{
            flex: 2
          }}>
                      Confirmar Carga y Salir de Viaje
                    </button>
                  </div>
                </div>}

            {/* ACTION: IN TRANSIT / DELIVER ACTIONS (Transportista) */}
            {user.rol === 'transportista' && selectedPedido.estado === 'en_transito' && <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem'
      }}>
                <div className="suggestion-banner">
                  <div>
                    <strong>¿Tuviste algún inconveniente en el viaje?</strong><br />
                    Registra roturas o pérdidas antes de llegar.
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowLossModal(true)}>
                    ⚠️ Reportar Rotura/Merma
                  </button>
                </div>

                <button className="btn btn-primary" onClick={handleMarkDelivered} disabled={loading} style={{
          width: '100%'
        }}>
                  Entregar en Sucursal (Confirmar Descarga)
                </button>
              </div>}

            {/* ACTION: CONFIRM RECEIPT / CROSS-CONFIRMATION (Sucursal Employee / Transportista Depot) */}
            {(user.rol === 'sucursal' && (selectedPedido.estado === 'en_transito' || user.sucursal_id === 4 && selectedPedido.estado === 'preparado') || user.rol === 'transportista' && selectedPedido.sucursal_destino_id === user.sucursal_id && (selectedPedido.estado === 'en_transito' || selectedPedido.estado === 'preparado')) && <div>
                <h4 style={{
          marginBottom: '0.5rem'
        }}>
                  {user.sucursal_id === 4 ? 'Confirmación de Recepción Interna' : user.rol === 'transportista' ? 'Recepción de Mercadería en Depósito' : 'Control Cruzado de Recepción Física'}
                </h4>
                <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-light)',
          marginBottom: '1.2rem'
        }}>
                  {user.sucursal_id === 4 ? 'Controla la mercadería retirada directamente de Fábrica. Escribe las cantidades físicas recibidas. Si hay diferencias, detalla el motivo.' : user.rol === 'transportista' ? 'Controla los insumos que ingresan a tu depósito. Ingresa las cantidades físicas recibidas.' : 'Controla la mercadería junto con el transportista. Escribe cantidades físicas recibidas. Si hay diferencias, detalla el motivo.'}
                </p>

                <div className="items-selection-grid" style={{
          marginBottom: '1.5rem'
        }}>
                  {selectedPedido.items.map(it => {
            const baseQty = it.cantidad_cargada > 0 ? it.cantidad_cargada : it.cantidad_preparada;
            return <div key={it.producto_id} style={{
              background: '#f9f9f9',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.05)',
              marginBottom: '0.75rem'
            }}>
                        <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                          <strong>{it.producto_nombre}</strong>
                          <span style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-light)'
                }}>
                            {user.sucursal_id === 4 || user.rol === 'transportista' ? 'Preparado' : 'Despachado'}: <strong>{formatQuantity(baseQty, productos.find(p => p.id === it.producto_id))}</strong>
                          </span>
                        </div>

                        <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                          <UnitCalculatorInput value={receiveItems[it.producto_id] ?? baseQty} onChange={val => {
                  setReceiveItems(prev => ({
                    ...prev,
                    [it.producto_id]: val
                  }));
                }} product={productos.find(p => p.id === it.producto_id)} placeholder="Recibido" min={0} />

                          {(receiveItems[it.producto_id] ?? baseQty) !== baseQty && <input type="text" className="form-control" placeholder="Motivo de la discrepancia (Obligatorio)" value={receiveReasons[it.producto_id] || ''} onChange={e => setReceiveReasons(prev => ({
                  ...prev,
                  [it.producto_id]: e.target.value
                }))} required />}
                        </div>
                      </div>;
          })}
                </div>

                <button className="btn btn-success" onClick={handleConfirmReceive} disabled={loading} style={{
          width: '100%'
        }}>
                  Confirmar Recepción y Actualizar mi Stock
                </button>
              </div>}
          </div>
        </div>;
};
export default OrderDetailModal;