import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo, formatQuantityShort, getCategoryEmoji } from '../../utils/formatters';
import { getFlavorGroup } from '../../utils/flavors';
import BranchStockView from '../sucursal/BranchStockView';
const AdminStockView = () => {
  const [stockPastryFilter, setStockPastryFilter] = React.useState('Todos');
  const [selectedBranchId, setSelectedBranchId] = React.useState('all');
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportIncludeBranches, setExportIncludeBranches] = React.useState(true);
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
  const displaySucursales = sucursales.filter(s => !s.nombre.toLowerCase().includes('transportista') && !s.nombre.toLowerCase().includes('deposito de insumos'));
  
  return <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '0.8rem', borderRadius: '10px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sucursal a gestionar:</span>
        <select 
          className="form-control" 
          style={{ maxWidth: '250px' }} 
          value={selectedBranchId} 
          onChange={e => setSelectedBranchId(e.target.value)}
        >
          <option value="all">Todas las Sucursales (Matriz)</option>
          {displaySucursales.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>
      {selectedBranchId !== 'all' ? (
        <BranchStockView adminSelectedBranchId={parseInt(selectedBranchId)} />
      ) : (
        <>
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginLeft: 'auto' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={exportIncludeBranches} onChange={e => setExportIncludeBranches(e.target.checked)} />
            Incluir Sucursales
          </label>
          <button className="btn btn-primary btn-sm" disabled={isExporting} onClick={() => {
            setIsExporting(true);
            try {
              const selectedCat = categories.find(c => c.id === adminStockTab);
              let catProdsExport = adminStockMatriz.filter(p => p.categoria === selectedCat?.id && p.es_evento === showEventStock);
              
              if (selectedCat?.id === 'helados') {
                if (showEventStock) catProdsExport = catProdsExport.filter(p => p.tipo && p.tipo.includes('balde'));
                if (stockGroupFilter !== 'Todos') catProdsExport = catProdsExport.filter(p => (p.clasificacion_sabor || getFlavorGroup(p.producto_nombre)) === stockGroupFilter);
                if (iceCreamFormatFilter === 'Vasqueta') catProdsExport = catProdsExport.filter(p => p.tipo === 'vasqueta_5_6k');
                else if (iceCreamFormatFilter === 'Balde') catProdsExport = catProdsExport.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
              }
              if (selectedCat?.id === 'pasteleria' && stockPastryFilter !== 'Todos') {
                catProdsExport = catProdsExport.filter(p => p.tipo === stockPastryFilter);
              }
              if (adminStockSearch) {
                catProdsExport = catProdsExport.filter(p => p.producto_nombre.toLowerCase().includes(adminStockSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(adminStockSearch.toLowerCase()));
              }

              const colsToExport = exportIncludeBranches ? displaySucursales : displaySucursales.filter(s => s.id === 1);

              let htmlContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="utf-8" /></head>
                <body>
                  <table>
                    <tr><td colspan="${colsToExport.length + 3}" style="font-weight: bold; font-size: 16px; background-color: #059669; color: white;">Stock Actual - ${selectedCat?.name} (${showEventStock ? 'Eventos' : 'Común'})</td></tr>
                    <tr>
                      <th style="background-color: #e2e8f0;">Producto / Sabor</th>
                      <th style="background-color: #e2e8f0;">Tipo / Formato</th>
                      ${colsToExport.map(s => `<th style="background-color: #e2e8f0;">${s.nombre}</th>`).join('')}
                      <th style="background-color: #cbd5e1;">TOTAL GENERAL</th>
                    </tr>
              `;

              catProdsExport.forEach(prod => {
                const isHelado = prod.categoria === 'helados';
                let rowHtml = `<tr>
                  <td><strong>${prod.producto_nombre}</strong></td>
                  <td style="text-transform: capitalize;">${formatTipo(prod.tipo)}</td>
                `;
                let rowTotal = 0;
                colsToExport.forEach(s => {
                  const qty = prod.stock_por_sucursal?.[s.id.toString()] || 0;
                  rowTotal += qty;
                  rowHtml += `<td>${isHelado ? Number(qty).toFixed(2) + ' kg' : qty + ' u'}</td>`;
                });
                rowHtml += `<td style="font-weight: bold; background-color: #f8fafc;">${isHelado ? Number(rowTotal).toFixed(2) + ' kg' : rowTotal + ' u'}</td></tr>`;
                htmlContent += rowHtml;
              });

              htmlContent += `</table></body></html>`;

              const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `stock_actual_${selectedCat?.name}.xls`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } finally {
              setIsExporting(false);
            }
          }}>
            {isExporting ? '⏳ Exportando...' : '📊 Exportar a Excel'}
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
        {categories.map(tab => <button key={tab.id} className={`tab-btn ${adminStockTab === tab.id ? 'active' : ''}`} style={{
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        borderRadius: '8px',
        fontWeight: adminStockTab === tab.id ? 600 : 400
      }} onClick={() => {
        setAdminStockTab(tab.id);
        if (tab.id !== 'pasteleria') {
          setStockPastryFilter('Todos');
        }
      }}>
            {`${getCategoryEmoji(tab.id)} ${tab.name}`}
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
      if (selectedCat.id === 'pasteleria') {
        if (stockPastryFilter !== 'Todos') {
          catProds = catProds.filter(p => p.tipo === stockPastryFilter);
        }
      }
      if (adminStockSearch) {
        catProds = catProds.filter(p => p.producto_nombre.toLowerCase().includes(adminStockSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(adminStockSearch.toLowerCase()));
      }
      return <div className="glass-card">
            {selectedCat.id === 'pasteleria' && <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          paddingBottom: '0.8rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
                <span style={{
              fontSize: '0.85rem',
              color: 'var(--text-light)'
            }}>Categoría:</span>
                <select className="form-control form-control-sm" value={stockPastryFilter} onChange={e => setStockPastryFilter(e.target.value)} style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.15)',
              background: 'transparent',
              fontSize: '0.8rem',
              fontWeight: 600,
              minWidth: '150px'
            }}>
                  <option value="Todos">Todos</option>
                  <option value="Chocolates, macaron y postres">Chocolates, macaron y postres</option>
                  <option value="Festivos">Festivos</option>
                  <option value="Viennoiserie y escones">Viennoiserie y escones</option>
                  <option value="Sanguches">Sanguches</option>
                  <option value="Tortas">Tortas</option>
                  <option value="Alfajores">Alfajores</option>
                </select>
              </div>
            </div>}
            
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
                      {displaySucursales.map(s => (
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
                          {displaySucursales.map(s => {
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
                          tipo: prod.tipo,
                          stock_actual: qty
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
        </>
      )}
    </div>;
};
export default AdminStockView;