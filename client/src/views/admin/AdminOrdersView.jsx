import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo, formatQuantity } from '../../utils/formatters';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
const AdminOrdersView = () => {
  const {
    adminOrderItems,
    setAdminOrderItems,
    adminOrderDestination,
    setAdminOrderDestination,
    handleAdminCreateOrder,
    loading,
    adminOrderSearch,
    setAdminOrderSearch,
    adminOrderSupplierFilter,
    setAdminOrderSupplierFilter,
    proveedores,
    adminOrderSubTab,
    setAdminOrderSubTab,
    iceCreamFormatFilter,
    setIceCreamFormatFilter,
    productos,
    stockData,
    sucursales
  } = useData();
  return <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="glass-card" style={{ flex: '1 1 60%', minWidth: '300px' }}>
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
        <div>
          <h3 className="section-title" style={{
          margin: 0,
          border: 'none'
        }}>Armar y Preparar Pedido</h3>
          <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)',
          marginTop: '0.25rem'
        }}>
            Crea un pedido desde Fábrica hacia cualquier sucursal o depósito. Se marcará como <strong>Preparado</strong> y descontará el stock de fábrica automáticamente.
          </p>
        </div>
        <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        </div>
      </div>

      {/* Destination and Actions bar */}
      <div style={{
      display: 'flex',
      gap: '1.5rem',
      marginBottom: '2rem',
      background: 'rgba(255,255,255,0.02)',
      padding: '1.2rem',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      flexWrap: 'wrap',
      alignItems: 'flex-end'
    }}>
        <div style={{
        flex: '1 1 250px'
      }}>
          <label style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)',
          marginBottom: '0.5rem',
          display: 'block',
          fontWeight: 600
        }}>
            📍 Seleccionar Sucursal o Depósito Destino:
          </label>
          <select className="form-control" value={adminOrderDestination} onChange={e => setAdminOrderDestination(e.target.value)} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'var(--text)',
          borderRadius: '8px',
          padding: '0.6rem',
          fontSize: '0.9rem',
          width: '100%',
          fontWeight: 600
        }}>
            <option value="">-- Seleccionar Destino --</option>
            {sucursales.filter(s => s.id !== 1).map(s => <option key={s.id} value={s.id}>
                {s.nombre} {s.id === 5 ? '🚚 (Chofer)' : ''}
              </option>)}
          </select>
        </div>

        <div style={{
        flex: '2 1 300px',
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end'
      }}>
          <button className="btn btn-outline" onClick={() => {
          setAdminOrderItems({});
          setAdminOrderDestination('');
        }} style={{
          padding: '0.6rem 1.2rem',
          borderRadius: '8px'
        }}>
            Limpiar Todo
          </button>
        </div>
      </div>

      {/* Sub-tabs and Search Bar */}
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.2rem',
      marginBottom: '2rem',
      background: 'rgba(0, 0, 0, 0.02)',
      padding: '1rem',
      borderRadius: '12px',
      border: '1px solid rgba(0, 0, 0, 0.06)'
    }}>
        <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
          <div style={{
          position: 'relative',
          flex: '2 1 200px'
        }}>
            <input type="text" placeholder="🔍 Buscar producto o sabor..." className="form-control" style={{
            padding: '0.75rem 1.2rem 0.75rem 2.8rem',
            borderRadius: '12px',
            background: 'var(--input-bg)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: 'var(--text-dark)',
            fontSize: '1.05rem',
            width: '100%'
          }} value={adminOrderSearch} onChange={e => setAdminOrderSearch(e.target.value)} />
          </div>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: '1 1 180px'
        }}>
            <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            whiteSpace: 'nowrap'
          }}>Proveedor:</span>
            <select className="form-control" style={{
            borderRadius: '10px',
            background: 'var(--input-bg)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: 'var(--text-dark)',
            fontSize: '0.9rem',
            padding: '0.5rem',
            height: 'auto',
            minHeight: 'unset'
          }} value={adminOrderSupplierFilter} onChange={e => setAdminOrderSupplierFilter(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          {adminOrderSubTab === 'helados' && <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: '1 1 200px'
        }}>
              <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            whiteSpace: 'nowrap'
          }}>Formato:</span>
              <div style={{
            display: 'flex',
            gap: '0.2rem'
          }}>
                {[{
              id: 'Todos',
              label: 'Todos'
            }, {
              id: 'Vasqueta',
              label: 'Vasquetas'
            }, {
              id: 'Balde',
              label: 'Baldes'
            }].map(fmt => <button key={fmt.id} type="button" className={`btn btn-sm ${iceCreamFormatFilter === fmt.id ? 'btn-primary' : 'btn-outline'}`} style={{
              fontSize: '0.8rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              minHeight: 'unset',
              fontWeight: 600
            }} onClick={() => setIceCreamFormatFilter(fmt.id)}>
                    {fmt.label}
                  </button>)}
              </div>
            </div>}
        </div>

        <div style={{
        display: 'flex',
        gap: '0.4rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '0.6rem',
        flexWrap: 'wrap'
      }}>
          {[{
          id: 'helados',
          label: '🍧 Helados'
        }, {
          id: 'pasteleria_helada',
          label: '🍦 Pastelería Helada'
        }, {
          id: 'pasteleria',
          label: '🍰 Pastelería Clásica'
        }, {
          id: 'viennoiserie',
          label: '🥐 Viennoiserie'
        }, {
          id: 'termicos',
          label: '📦 Térmicos'
        }, {
          id: 'otros',
          label: '✨ Otros'
        }].map(tab => <button key={tab.id} className={`tab-btn ${adminOrderSubTab === tab.id ? 'active' : ''}`} style={{
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          borderRadius: '8px',
          fontWeight: adminOrderSubTab === tab.id ? 600 : 400
        }} onClick={() => {
          setAdminOrderSubTab(tab.id);
          setAdminOrderSearch('');
        }}>
              {tab.label}
            </button>)}
        </div>
      </div>

      {(() => {
      let filteredProds = productos.filter(p => p.categoria === adminOrderSubTab);
      if (adminOrderSubTab === 'helados') {
        if (iceCreamFormatFilter === 'Vasqueta') {
          filteredProds = filteredProds.filter(p => p.tipo === 'vasqueta_5_6k');
        } else if (iceCreamFormatFilter === 'Balde') {
          filteredProds = filteredProds.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
        }
      }
      if (adminOrderSearch) {
        filteredProds = filteredProds.filter(p => p.nombre.toLowerCase().includes(adminOrderSearch.toLowerCase()) || formatTipo(p.tipo).toLowerCase().includes(adminOrderSearch.toLowerCase()));
      }
      if (adminOrderSupplierFilter) {
        filteredProds = filteredProds.filter(p => p.proveedor_id === parseInt(adminOrderSupplierFilter));
      }
      if (filteredProds.length === 0) {
        return <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-light)'
        }}>
              <div style={{
            fontSize: '2.5rem',
            marginBottom: '1rem'
          }}>🔍</div>
              <p style={{
            margin: 0,
            fontWeight: 500
          }}>No se encontraron productos.</p>
            </div>;
      }
      return <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto / Sabor</th>
                  <th>Stock Fábrica</th>
                  <th>Stock Destino</th>
                  <th style={{
                width: '120px'
              }}>Pedir Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredProds.map(prod => {
              const qty = adminOrderItems[prod.id] || 0;
              const factoryStock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 1 && s.es_evento === false)?.cantidad || 0;
              let destStock = '-';
              if (adminOrderDestination) {
                destStock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === parseInt(adminOrderDestination) && s.es_evento === false)?.cantidad || 0;
              }
              const isExceeding = qty > factoryStock;
              return <tr key={prod.id}>
                      <td>
                        <strong>{prod.nombre}</strong>
                        <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-light)',
                    textTransform: 'capitalize'
                  }}>{formatTipo(prod.tipo)}</div>
                        {isExceeding && <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--danger)',
                    fontWeight: 600,
                    marginTop: '2px'
                  }}>
                            ⚠️ Excede stock disponible en Fábrica ({factoryStock} disponibles)
                          </div>}
                      </td>
                      <td>
                        <span style={{
                    fontWeight: 600,
                    color: factoryStock > 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                          {formatQuantity(factoryStock, prod)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                    fontWeight: 600
                  }}>
                          {destStock !== '-' ? formatQuantity(destStock, prod) : '-'}
                        </span>
                      </td>
                      <td>
                        <div style={{
                    width: '140px'
                  }}>
                          <UnitCalculatorInput value={qty || 0} onChange={val => {
                      setAdminOrderItems(prev => ({
                        ...prev,
                        [prod.id]: val
                      }));
                    }} product={prod} placeholder="0" min={0} />
                        </div>
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>;
    })()}
    </div>
    
    <div className="glass-card mobile-summary-panel" style={{
      flex: '1 1 30%',
      minWidth: '300px',
      position: 'sticky',
      top: '1rem'
    }}>
      <h3 className="section-title" style={{
        margin: 0,
        border: 'none',
        marginBottom: '1rem'
      }}>📋 Resumen del Pedido</h3>
      {(() => {
        const selectedItemsList = Object.entries(adminOrderItems)
          .filter(([_, qty]) => parseFloat(qty) > 0)
          .map(([id, qty]) => ({
            id: parseInt(id),
            qty: parseFloat(qty)
          }));
          
        if (selectedItemsList.length === 0) {
          return <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            textAlign: 'center',
            padding: '2rem 0'
          }}>No has seleccionado ningún producto aún.</p>;
        }
        
        return <>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            marginBottom: '1.5rem',
            paddingRight: '0.5rem'
          }}>
            {selectedItemsList.map(item => {
              const p = productos.find(prod => prod.id === item.id);
              if (!p) return null;
              return <div key={item.id} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                padding: '0.8rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    flex: 1,
                    paddingRight: '0.5rem'
                  }}>
                    <strong>{p.nombre}</strong>
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-light)',
                      textTransform: 'capitalize'
                    }}>{formatTipo(p.tipo)}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    borderColor: 'transparent',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }} onClick={e => {
                    e.stopPropagation();
                    setAdminOrderItems(prev => {
                      const n = { ...prev };
                      delete n[item.id];
                      return n;
                    });
                  }} title="Quitar">
                    ✕
                  </button>
                </div>
                <div>
                  <UnitCalculatorInput value={item.qty} onChange={val => {
                    setAdminOrderItems(prev => ({
                      ...prev,
                      [item.id]: val
                    }));
                  }} product={p} placeholder="0" min={0} />
                </div>
              </div>;
            })}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleAdminCreateOrder} disabled={loading} style={{
              width: '100%',
              padding: '0.8rem',
              fontWeight: 600
            }}>
              🚀 Crear y Preparar Pedido
            </button>
          </div>
        </>;
      })()}
    </div>
    
    {/* Spacer to allow scrolling past the fixed panel on mobile */}
    <div className="mobile-summary-spacer"></div>
  </div>;
};
export default AdminOrdersView;