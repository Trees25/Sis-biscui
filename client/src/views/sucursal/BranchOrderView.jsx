import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const BranchOrderView = () => {
  const {
    user,

    pendingItems,
    formatTipo,
    formatQuantity,
    productos,
    setOrderItems,
    orderSearchQuery,
    setOrderSearchQuery,
    orderSubTab,
    setOrderSubTab,
    categories,
    suggestions,
    orderItems,
    handleBranchCreateOtrosProduct,
    branchOtrosForm,
    setBranchOtrosForm,
    loading,
    handleCreateOrder
  } = useData();
  return <div style={{
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  }}>
                <div className="glass-card" style={{
      flex: '1 1 60%',
      minWidth: '300px'
    }}>
                  <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
                  <div>
                    <h3 className="section-title" style={{
            margin: 0,
            border: 'none'
          }}>Armar Pedido</h3>
                  </div>
                  <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>

                  </div>
                </div>

                {pendingItems.length > 0 && <div className="glass-card" style={{
        background: 'rgba(255, 171, 0, 0.08)',
        border: '1px solid rgba(255, 171, 0, 0.3)',
        borderRadius: '12px',
        padding: '1.2rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--warning)',
          fontWeight: 700,
          fontSize: '1.05rem',
          marginBottom: '0.6rem'
        }}>
                      <span>⚠️</span> Productos pendientes de envíos anteriores (Falta de Stock)
                    </div>
                    <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)',
          margin: '0 0 1rem 0'
        }}>
                      Los siguientes productos no pudieron cargarse por falta de stock. Agrégalos a este nuevo pedido para volver a solicitarlos:
                    </p>
                    <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.8rem',
          alignItems: 'center'
        }}>
                      {pendingItems.map(p => <div key={p.producto_id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(0, 0, 0, 0.02)',
            padding: '0.5rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
                          <div style={{
              fontSize: '0.85rem'
            }}>
                            <strong>{p.nombre}</strong> <span style={{
                color: 'var(--text-light)',
                fontSize: '0.75rem'
              }}>({formatTipo(p.tipo)})</span>: <strong style={{
                color: 'var(--warning)'
              }}>{formatQuantity(p.cantidad, productos.find(prod => prod.id === p.producto_id))}</strong>
                          </div>
                          <button className="btn btn-secondary btn-sm" style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              minHeight: 'unset',
              height: 'auto',
              borderRadius: '4px'
            }} onClick={() => {
              setOrderItems(prev => ({
                ...prev,
                [p.producto_id]: (prev[p.producto_id] || 0) + p.cantidad
              }));
            }}>
                            ＋ Agregar
                          </button>
                        </div>)}
                      <button className="btn btn-primary btn-sm" style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            fontWeight: 600
          }} onClick={() => {
            setOrderItems(prev => {
              const updated = {
                ...prev
              };
              pendingItems.forEach(p => {
                updated[p.producto_id] = (updated[p.producto_id] || 0) + p.cantidad;
              });
              return updated;
            });
          }}>
                        ⚡ Agregar Todos
                      </button>
                    </div>
                  </div>}

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
          position: 'relative'
        }}>
                    <input type="text" placeholder="🔍 Buscar producto o sabor..." className="form-control" style={{
            padding: '0.75rem 1.2rem 0.75rem 2.8rem',
            borderRadius: '12px',
            background: 'var(--input-bg)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: 'var(--text-dark)',
            fontSize: '1.05rem',
            width: '100%'
          }} value={orderSearchQuery} onChange={e => setOrderSearchQuery(e.target.value)} />
                  </div>

                  <div style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
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
          }].map(tab => <button key={tab.id} className={`tab-btn ${orderSubTab === tab.id ? 'active' : ''}`} style={{
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            borderRadius: '8px',
            fontWeight: orderSubTab === tab.id ? 600 : 400
          }} onClick={() => {
            setOrderSubTab(tab.id);
            setOrderSearchQuery('');
          }}>
                        {tab.label}
                      </button>)}
                  </div>
                </div>

                {(() => {
        const activeCategories = categories.filter(cat => cat.id === orderSubTab);
        const hasVisibleProducts = activeCategories.some(cat => {
          let catSuggestions = suggestions.filter(s => s.categoria === cat.id);

          if (orderSearchQuery) {
            catSuggestions = catSuggestions.filter(s => s.nombre.toLowerCase().includes(orderSearchQuery.toLowerCase()) || formatTipo(s.tipo).toLowerCase().includes(orderSearchQuery.toLowerCase()));
          }
          return catSuggestions.length > 0;
        });
        if (!hasVisibleProducts) {
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
            }}>No se encontraron productos en esta categoría.</p>
                      </div>;
        }
        return activeCategories.map(cat => {
          let catSuggestions = suggestions.filter(s => s.categoria === cat.id);

          if (orderSearchQuery) {
            catSuggestions = catSuggestions.filter(s => s.nombre.toLowerCase().includes(orderSearchQuery.toLowerCase()) || formatTipo(s.tipo).toLowerCase().includes(orderSearchQuery.toLowerCase()));
          }
          if (catSuggestions.length === 0) return null;
          return <div key={cat.id} style={{
            marginBottom: '1.8rem'
          }}>
                        <h4 style={{
              margin: '1.5rem 0 0.75rem 0',
              color: 'var(--primary)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '0.4rem',
              fontSize: '1.05rem',
              fontWeight: 600
            }}>
                          {cat.name}
                        </h4>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Producto / Sabor</th>
                                <th>Mi Stock</th>
                                <th>Stock Fábrica</th>
                                <th>Consumo Prom. Diario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catSuggestions.map(s => {
                    const requestedQty = orderItems[s.producto_id] || 0;
                    const isExceedingFactoryStock = requestedQty > s.stock_fabrica;
                    const isSelected = requestedQty > 0;
                    return <tr key={s.producto_id} style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255, 171, 0, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--warning)' : '3px solid transparent'
                    }} onClick={() => {
                      setOrderItems(prev => {
                        const updated = {
                          ...prev
                        };
                        const current = updated[s.producto_id] || 0;
                        if (current === 0) {
                          updated[s.producto_id] = 1;
                        } else {
                          updated[s.producto_id] = current + 1;
                        }
                        return updated;
                      });
                    }} title="Clic para agregar/sumar al pedido">
                                    <td>
                                      <strong>{s.nombre}</strong>
                                      <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-light)',
                          textTransform: 'capitalize'
                        }}>{formatTipo(s.tipo)}</div>
                                      {isExceedingFactoryStock && <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--danger)',
                          fontWeight: 600,
                          marginTop: '2px'
                        }}>
                                          ⚠️ Excede stock ({s.stock_fabrica} disponibles)
                                        </div>}
                                    </td>
                                    <td>{formatQuantity(s.stock_actual, productos.find(p => p.id === s.producto_id))}</td>
                                    <td>
                                      <span style={{
                          fontWeight: 600,
                          color: s.stock_fabrica > 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                                        {formatQuantity(s.stock_fabrica, productos.find(p => p.id === s.producto_id))}
                                      </span>
                                    </td>
                                    <td>{formatQuantity(s.consumo_promedio_diario, productos.find(p => p.id === s.producto_id))}</td>
                                  </tr>;
                  })}
                            </tbody>
                          </table>
                        </div>
                      </div>;
        });
      })()}

                {orderSubTab === 'otros' && <div className="glass-card" style={{
        marginTop: '2rem',
        padding: '1.2rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: '12px'
      }}>
                    <h4 style={{
          margin: '0 0 1rem 0',
          fontSize: '1rem',
          color: 'var(--primary)',
          fontWeight: 600
        }}>
                      ➕ Agregar Producto Personalizado a "Otros"
                    </h4>
                    <form onSubmit={handleBranchCreateOtrosProduct} style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.8rem',
          alignItems: 'flex-end'
        }}>
                      <div style={{
            flex: '1 1 200px'
          }}>
                        <label style={{
              fontSize: '0.8rem',
              color: 'var(--text-light)',
              marginBottom: '0.4rem',
              display: 'block'
            }}>Nombre del Producto</label>
                        <input type="text" placeholder="Ej. Vasos de telgopor chicos" className="form-control" value={branchOtrosForm.nombre} onChange={e => setBranchOtrosForm({
              ...branchOtrosForm,
              nombre: e.target.value
            })} required />
                      </div>
                      <div style={{
            width: '150px'
          }}>
                        <label style={{
              fontSize: '0.8rem',
              color: 'var(--text-light)',
              marginBottom: '0.4rem',
              display: 'block'
            }}>Tipo</label>
                        <select className="form-control" value={branchOtrosForm.tipo} onChange={e => setBranchOtrosForm({
              ...branchOtrosForm,
              tipo: e.target.value
            })}>
                          <option value="packaging">Packaging</option>
                          <option value="insumo">Insumo</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-secondary" style={{
            padding: '0.55rem 1.2rem'
          }} disabled={loading}>
                        Crear y Agregar
                      </button>
                    </form>
                  </div>}
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
      }}>🛒 Resumen del Pedido</h3>
                  {(() => {
        const selectedItemsList = Object.entries(orderItems).filter(([_, qty]) => parseFloat(qty) > 0).map(([id, qty]) => ({
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
              const prod = productos.find(p => p.id === item.id);
              if (!prod) return null;
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
                                    <strong>{prod.nombre}</strong>
                                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-light)',
                      textTransform: 'capitalize'
                    }}>{formatTipo(prod.tipo)}</div>
                                  </div>
                                  <button className="btn btn-outline btn-sm" style={{
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    borderColor: 'transparent',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }} onClick={e => {
                    e.stopPropagation();
                    setOrderItems(prev => {
                      const n = {
                        ...prev
                      };
                      delete n[item.id];
                      return n;
                    });
                  }} title="Quitar">
                                    ✕
                                  </button>
                                </div>
                                <div>
                                  <UnitCalculatorInput value={item.qty} onChange={val => {
                    setOrderItems(prev => ({
                      ...prev,
                      [item.id]: val
                    }));
                  }} product={prod} placeholder="0" min={0} />
                                </div>
                              </div>;
            })}
                        </div>
                        <div style={{
            marginTop: '1rem'
          }}>
                          <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading} style={{
              width: '100%'
            }}>
                            Enviar Pedido a Fábrica
                          </button>
                        </div>
                      </>;
      })()}
                </div>
                
                {/* Spacer to allow scrolling past the fixed panel on mobile */}
                <div className="mobile-summary-spacer"></div>
              </div>;
};
export default BranchOrderView;