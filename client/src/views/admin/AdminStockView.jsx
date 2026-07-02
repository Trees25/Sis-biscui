import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo, formatQuantityShort } from '../../utils/formatters';
import { getFlavorGroup } from '../../utils/flavors';
const AdminStockView = () => {
  const {
    showEventStock,
    setShowEventStock,
    adminStockTab,
    setAdminStockTab,
    categories,
    adminStockMatriz,
    stockGroupFilter,
    setStockGroupFilter,
    iceCreamFormatFilter,
    setIceCreamFormatFilter,
    adminStockSearch,
    setAdminStockSearch,
    sucursales,
    user,
    setEditStockForm,
    setEditStockItemDetails,
    setShowEditStockModal,
    toggleInventoryLock
  } = useData();
  return <div>
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
        <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        margin: 0,
        paddingLeft: '0.5rem'
      }}>
          Monitorea los niveles de inventario en tiempo real de cada sabor y producto en todas las locaciones físicas de Biscui.
        </p>
        <div style={{
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.04)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(0, 0, 0, 0.08)'
      }}>
          <button className={`btn btn-sm ${!showEventStock ? 'btn-primary' : 'btn-outline'}`} style={{
          border: 'none',
          borderRadius: '8px',
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          minHeight: 'unset'
        }} onClick={() => setShowEventStock(false)}>
            📦 Stock Común
          </button>
          <button className={`btn btn-sm ${showEventStock ? 'btn-primary' : 'btn-outline'}`} style={{
          border: 'none',
          borderRadius: '8px',
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          minHeight: 'unset'
        }} onClick={() => setShowEventStock(true)}>
            🎉 Stock de Eventos
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div style={{
      display: 'flex',
      gap: '0.4rem',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      paddingBottom: '0.6rem',
      marginBottom: '1.5rem',
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
      }].map(tab => <button key={tab.id} className={`tab-btn ${adminStockTab === tab.id ? 'active' : ''}`} style={{
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        borderRadius: '8px',
        fontWeight: adminStockTab === tab.id ? 600 : 400
      }} onClick={() => setAdminStockTab(tab.id)}>
            {tab.label}
          </button>)}
      </div>

      {(() => {
      const selectedCat = categories.find(c => c.id === adminStockTab);
      if (!selectedCat) return null;
      let catProds = adminStockMatriz.filter(p => p.categoria === selectedCat.id && p.es_evento === showEventStock);
      if (selectedCat.id === 'helados') {
        if (showEventStock) {
          catProds = catProds.filter(p => p.tipo && p.tipo.includes('balde'));
        }
        if (stockGroupFilter !== 'Todos') {
          catProds = catProds.filter(p => (p.clasificacion_sabor || getFlavorGroup(p.producto_nombre)) === stockGroupFilter);
        }
        if (iceCreamFormatFilter === 'Vasqueta') {
          catProds = catProds.filter(p => p.tipo === 'vasqueta_5_6k');
        } else if (iceCreamFormatFilter === 'Balde') {
          catProds = catProds.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
        }
      }
      if (adminStockSearch) {
        catProds = catProds.filter(p => p.producto_nombre.toLowerCase().includes(adminStockSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(adminStockSearch.toLowerCase()));
      }
      return <div className="glass-card">
            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '0.5rem'
        }}>
              <h3 className="section-title" style={{
            margin: 0,
            border: 'none'
          }}>{selectedCat.name}</h3>
              
              <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
                  <span style={{
                fontSize: '0.85rem',
                color: 'var(--text-light)',
                fontWeight: 600
              }}>Buscar:</span>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar sabor..." value={adminStockSearch} onChange={e => setAdminStockSearch(e.target.value)} />
                </div>

                {selectedCat.id === 'helados' && <div style={{
              display: 'flex',
              gap: '0.8rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
                    <div style={{
                display: 'flex',
                gap: '0.3rem'
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
                }].map(fmt => <button key={fmt.id} className={`btn btn-sm ${iceCreamFormatFilter === fmt.id ? 'btn-primary' : 'btn-outline'}`} style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600
                }} onClick={() => setIceCreamFormatFilter(fmt.id)}>
                          {fmt.label}
                        </button>)}
                    </div>
                    <div style={{
                width: '1px',
                height: '18px',
                background: 'rgba(255,255,255,0.1)'
              }}></div>
                    <div style={{
                display: 'flex',
                gap: '0.3rem',
                flexWrap: 'wrap'
              }}>
                      {['Todos', 'Dulces de leche', 'Chocolate', 'Cremas', 'Sin gluten', 'Frutales al agua'].map(group => <button key={group} className={`btn btn-sm ${stockGroupFilter === group ? 'btn-primary' : 'btn-outline'}`} style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px'
                }} onClick={() => setStockGroupFilter(group)}>
                          {group}
                        </button>)}
                    </div>
                  </div>}
              </div>
            </div>

            {catProds.length === 0 ? <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-light)'
        }}>
                <p style={{
            margin: 0,
            fontWeight: 500
          }}>No se encontraron productos en esta categoría.</p>
              </div> : <div className="table-container">
                <table className="stock-matrix-table">
                  <thead>
                    <tr>
                      <th>Producto / Sabor</th>
                      <th>Tipo / Formato</th>
                      {sucursales.map(s => (
                        <th key={s.id}>
                          <div>{s.nombre}</div>
                          {s.id !== 1 && (
                            <button
                              className={`btn btn-sm ${s.inventario_habilitado ? 'btn-danger' : 'btn-primary'}`}
                              style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem', marginTop: '0.4rem', borderRadius: '4px' }}
                              onClick={() => toggleInventoryLock(s.id, !s.inventario_habilitado)}
                              title={s.inventario_habilitado ? "Bloquear inventario para esta sucursal" : "Habilitar inventario para esta sucursal"}
                            >
                              {s.inventario_habilitado ? '🔒 Bloquear Inv.' : '🔓 Habilitar Inv.'}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catProds.map(prod => {
                const getCellClass = qty => {
                  if (qty === 0) return 'matrix-cell-empty';
                  if (qty < 5) return 'matrix-cell-low';
                  return 'matrix-cell-ok';
                };
                return <tr key={prod.producto_id}>
                          <td><strong>{prod.producto_nombre}</strong></td>
                          <td><span style={{
                      fontSize: '0.8rem',
                      textTransform: 'capitalize'
                    }}>{formatTipo(prod.tipo)}</span></td>
                          {sucursales.map(s => {
                    const qty = prod.stock_por_sucursal?.[s.id.toString()] || 0;
                    return <td key={s.id} className={getCellClass(qty)} onClick={() => {
                      if (user.rol === 'admin') {
                        setEditStockForm({
                          producto_id: prod.producto_id,
                          sucursal_id: s.id,
                          es_evento: showEventStock,
                          cantidad: qty
                        });
                        setEditStockItemDetails({
                          producto_nombre: prod.producto_nombre,
                          sucursal_nombre: s.nombre,
                          tipo: prod.tipo
                        });
                        setShowEditStockModal(true);
                      }
                    }} style={user.rol === 'admin' ? {
                      cursor: 'pointer'
                    } : {}} title={user.rol === 'admin' ? 'Click para editar stock' : ''}>
                                {formatQuantityShort(qty, prod)}
                              </td>;
                  })}
                        </tr>;
              })}
                  </tbody>
                </table>
              </div>}
          </div>;
    })()}
    </div>;
};
export default AdminStockView;