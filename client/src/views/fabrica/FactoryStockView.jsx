import { useData } from '../../context/DataContext';
import React from 'react';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';

const getStockColor = (qty) => {
  if (qty > 5) return 'var(--success)'; // Green
  if (qty > 0) return 'var(--warning)'; // Orange
  return 'var(--danger)'; // Red
};

const FactoryStockView = () => {
  const {
    showEventStock,
    setShowEventStock,
    factoryStockSearch,
    setFactoryStockSearch,
    user,
    iceCreamFormatFilter,
    setIceCreamFormatFilter,
    stockGroupFilter,
    setStockGroupFilter,
    getGroupedStock,
    getProductNetWeight,
    stockData,
    isProductVisibleToRole,
    formatTipo,
    formatQuantity,
    productos
  } = useData();
  return <div className="glass-card">
                <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
                  <h3 className="section-title" style={{
        margin: 0,
        border: 'none'
      }}>Stock Actual en Fábrica (Depósito Principal)</h3>
                  <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)'
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

                <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    }}>
                  <span style={{
        fontSize: '0.85rem',
        color: 'var(--text-light)'
      }}>Buscar sabor/producto:</span>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por nombre..." value={factoryStockSearch} onChange={e => setFactoryStockSearch(e.target.value)} />
                </div>

                {user.rol === 'heladero' ? <>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
                      <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
                        <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            marginRight: '0.5rem'
          }}>Formato:</span>
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
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            fontWeight: 600
          }} onClick={() => setIceCreamFormatFilter(fmt.id)}>
                            {fmt.label}
                          </button>)}
                      </div>
                      <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
                        <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            marginRight: '0.5rem'
          }}>Categoría:</span>
                        {['Todos', 'Dulces de leche', 'Chocolate', 'Cremas', 'Sin gluten', 'Frutales al agua'].map(group => <button key={group} className={`btn btn-sm ${stockGroupFilter === group ? 'btn-primary' : 'btn-outline'}`} style={{
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            fontWeight: 600
          }} onClick={() => setStockGroupFilter(group)}>
                            {group}
                          </button>)}
                      </div>
                    </div>

                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sabor / Helado</th>
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta') && <th style={{
                textAlign: 'center'
              }}>Vasqueta</th>}
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && <th style={{
                textAlign: 'center'
              }}>Balde 5L</th>}
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && <th style={{
                textAlign: 'center'
              }}>Balde 10L</th>}
                            <th>Kilos Netos Totales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
              const groupedStock = getGroupedStock(showEventStock);
              let filteredStock = groupedStock.filter(s => stockGroupFilter === 'Todos' || s.group === stockGroupFilter);
              if (factoryStockSearch) {
                filteredStock = filteredStock.filter(s => s.flavor.toLowerCase().includes(factoryStockSearch.toLowerCase()) || s.group.toLowerCase().includes(factoryStockSearch.toLowerCase()));
              }

              const stockWithKilos = filteredStock.map(s => {
                const wVasqueta = s.vasqueta_id ? getProductNetWeight(s.vasqueta_id, 'vasqueta_5_6k') : 5.5;
                const wBalde5l = s.balde_4k_id ? getProductNetWeight(s.balde_4k_id, 'balde_4k') : 4.0;
                const wBalde10l = s.balde_8k_id ? getProductNetWeight(s.balde_8k_id, 'balde_8k') : 8.0;
                const totalKilos = (iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta' ? showEventStock ? 0 : s.vasqueta_qty * wVasqueta : 0) + (iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde' ? s.balde_4k_qty * wBalde5l + s.balde_8k_qty * wBalde10l : 0);
                return { ...s, totalKilos };
              });

              stockWithKilos.sort((a, b) => {
                const aHasStock = a.totalKilos > 0 ? 1 : 0;
                const bHasStock = b.totalKilos > 0 ? 1 : 0;
                if (aHasStock !== bHasStock) return bHasStock - aHasStock;
                return a.flavor.localeCompare(b.flavor);
              });

              if (stockWithKilos.length === 0) {
                const dynamicColSpan = iceCreamFormatFilter === 'Todos' ? 5 : iceCreamFormatFilter === 'Vasqueta' ? 3 : 4;
                return <tr>
                                  <td colSpan={dynamicColSpan} style={{
                    textAlign: 'center',
                    color: 'var(--text-light)'
                  }}>
                                    No hay productos en esta categoría con stock en Fábrica.
                                  </td>
                                </tr>;
              }
              return stockWithKilos.map(s => {
                const totalKilos = s.totalKilos;
                return <tr key={s.flavor}>
                                  <td>
                                    <strong>{s.flavor}</strong>
                                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-light)',
                      marginTop: '2px'
                    }}>
                                      Categoría: <span className="badge badge-solicitado" style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.3rem'
                      }}>{s.group}</span>
                                    </div>
                                  </td>
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta') && <td style={{
                    textAlign: 'center',
                    fontWeight: s.vasqueta_qty > 0 ? 700 : 400,
                    color: showEventStock ? 'var(--text-light)' : getStockColor(s.vasqueta_qty)
                  }}>
                                      {showEventStock ? '-' : s.vasqueta_qty}
                                    </td>}
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && <td style={{
                    textAlign: 'center',
                    fontWeight: s.balde_4k_qty > 0 ? 700 : 400,
                    color: getStockColor(s.balde_4k_qty)
                  }}>
                                      {s.balde_4k_qty}
                                    </td>}
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && <td style={{
                    textAlign: 'center',
                    fontWeight: s.balde_8k_qty > 0 ? 700 : 400,
                    color: getStockColor(s.balde_8k_qty)
                  }}>
                                      {s.balde_8k_qty}
                                    </td>}
                                  <td>
                                    {totalKilos > 0 ? <strong style={{
                      color: getStockColor(totalKilos > 0 ? (totalKilos > 10 ? 6 : 2) : 0)
                    }}>{totalKilos.toFixed(2)} kg</strong> : <strong style={{
                      color: 'var(--danger)'
                    }}>0 kg</strong>}
                                  </td>
                                </tr>;
              });
            })()}
                        </tbody>
                      </table>
                    </div>
                  </> : <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto / Sabor</th>
                          <th>Formato</th>
                          <th>Cantidad Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
            let items = productos.filter(p => isProductVisibleToRole(p, user.rol));
            if (showEventStock) {
              items = items.filter(p => p.categoria !== 'helados' || (p.tipo && p.tipo.includes('balde')));
            }
            if (factoryStockSearch) {
              items = items.filter(p => p.nombre.toLowerCase().includes(factoryStockSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(factoryStockSearch.toLowerCase()));
            }

            const itemsWithStock = items.map(p => {
              const sData = stockData.find(s => s.producto_id === p.id && s.sucursal_id === 1 && s.es_evento === showEventStock);
              const cantidad = sData ? sData.cantidad : 0;
              return { ...p, cantidad };
            });

            itemsWithStock.sort((a, b) => {
              const aHasStock = a.cantidad > 0 ? 1 : 0;
              const bHasStock = b.cantidad > 0 ? 1 : 0;
              if (aHasStock !== bHasStock) return bHasStock - aHasStock;
              return a.nombre.localeCompare(b.nombre);
            });

            return <>
                              {itemsWithStock.map(p => {
                                const cantidad = p.cantidad;
                                return <tr key={p.id}>
                                  <td><strong>{p.nombre}</strong></td>
                                  <td style={{
                  textTransform: 'capitalize'
                }}>{formatTipo(p.tipo)}</td>
                                  <td style={{
                  fontWeight: 700,
                  color: getStockColor(cantidad)
                }}>
                                    {formatQuantity(cantidad, p)}
                                  </td>
                                </tr>
                              })}
                              {itemsWithStock.length === 0 && <tr>
                                  <td colSpan="3" style={{
                  textAlign: 'center',
                  color: 'var(--text-light)'
                }}>
                                    No hay stock registrado en esta sección.
                                  </td>
                                </tr>}
                            </>;
          })()}
                      </tbody>
                    </table>
                  </div>}
              </div>;
};
export default FactoryStockView;