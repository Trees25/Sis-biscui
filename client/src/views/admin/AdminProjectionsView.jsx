import { useData } from '../../context/DataContext';
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const AdminProjectionsView = () => {
  const {
    prodReqSearch,
    setProdReqSearch,
    dashboardStats,
    recentLotes,
    getTareByTipo,
    formatTipo,
    formatQuantity,
    getProductNetWeight
  } = useData();

  const [exportMonth, setExportMonth] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  return <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-card" style={{ marginBottom: '1.5rem', flex: 1 }}>
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
                      <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Sugerencias de Fabricación (Demanda vs Stock Fábrica)</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem', marginBottom: 0 }}>
                        Flujo de planificación inteligente: sabores solicitados por sucursales en pedidos activos que superan el stock actual en fábrica.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar:</span>
                        <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar producto..." value={prodReqSearch} onChange={e => setProdReqSearch(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input type="month" className="form-control" value={exportMonth} onChange={e => setExportMonth(e.target.value)} title="Mes a exportar (vacío = últimos registros)" />
                        <button className="btn btn-primary" disabled={isExporting} onClick={async () => {
                          setIsExporting(true);
                          try {
                            let lotesToExport = recentLotes;
                            if (exportMonth) {
                              const [year, month] = exportMonth.split('-');
                              const startDate = new Date(year, month - 1, 1).toISOString();
                              const endDate = new Date(year, month, 1).toISOString();
                              
                              const { data: monthLotes, error } = await supabase.from('lotes_produccion').select(`
                                *,
                                productos ( nombre, tipo, categoria, unidad_medida ),
                                lote_pesos ( peso_bruto, peso_neto )
                              `).gte('fecha_produccion', startDate).lt('fecha_produccion', endDate).order('fecha_produccion', { ascending: false });
                              
                              if (!error && monthLotes) {
                                lotesToExport = monthLotes.map(lote => ({
                                  ...lote,
                                  pesos: lote.lote_pesos ? lote.lote_pesos.map(p => p.peso_bruto) : []
                                }));
                              }
                            }

                            const currentDate = new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
                            let htmlContent = `
                              <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                              <head>
                                <meta charset="utf-8" />
                                <style>
                                  body { font-family: 'Segoe UI', Arial, sans-serif; }
                                  .title { font-size: 20px; font-weight: bold; color: #1e3a8a; text-align: center; padding: 10px; background-color: #dbeafe; border-radius: 5px; }
                                  .subtitle { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px; }
                                  .section-header { font-size: 16px; font-weight: bold; color: #ffffff; background-color: #3b82f6; padding: 10px; margin-top: 20px; }
                                  .table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; }
                                  .th { background-color: #f1f5f9; color: #334155; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
                                  .td { padding: 8px; border: 1px solid #e2e8f0; color: #475569; }
                                  .td-strong { padding: 8px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: bold; }
                                  .td-number { padding: 8px; border: 1px solid #e2e8f0; text-align: right; }
                                  .th-green { background-color: #10b981; color: white; font-weight: bold; padding: 10px; border: 1px solid #059669; }
                                </style>
                              </head>
                              <body>
                                <div class="title">REPORTE DE PROYECCIONES EN FÁBRICA</div>
                                <div class="subtitle">Fecha de generación: ${currentDate} ${exportMonth ? `(Mes: ${exportMonth})` : ''}</div>
                                
                                <br/>
                                <table>
                                  <tr>
                                    <td colspan="7" class="section-header" style="background-color: #059669;">Historial de Fabricación ${exportMonth ? `del mes ${exportMonth}` : 'Reciente'}</td>
                                  </tr>
                                </table>
                                <table class="table">
                                  <thead>
                                    <tr>
                                      <th class="th-green">Lote</th>
                                      <th class="th-green">Producto/Sabor</th>
                                      <th class="th-green">Formato/Tipo</th>
                                      <th class="th-green" style="text-align: right;">Unidades</th>
                                      <th class="th-green" style="text-align: right;">Pesos Brutos</th>
                                      <th class="th-green" style="text-align: right;">Peso Neto Total</th>
                                      <th class="th-green">Fecha</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                            `;

                            lotesToExport.forEach(l => {
                              const isHelado = l.productos?.categoria === 'helados';
                              const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
                              const netKilos = l.pesos && l.pesos.length > 0 ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;
                              
                              const unidades = formatQuantity(l.cantidad, l.productos);
                              const pesosBrutos = isHelado && l.pesos && l.pesos.length > 0 ? l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ') : '-';
                              const pesoNeto = isHelado && l.pesos && l.pesos.length > 0 ? `${netKilos.toFixed(2)} kg` : (isHelado ? `~${(l.cantidad * getProductNetWeight(l.productos.id, l.productos.tipo)).toFixed(2)} kg (Est.)` : '-');
                              const fecha = new Date(l.fecha_produccion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

                              htmlContent += `
                                <tr>
                                  <td class="td" style="font-family: monospace; font-size: 11px;">${l.codigo_lote}</td>
                                  <td class="td-strong">${l.productos?.nombre}</td>
                                  <td class="td">${l.productos?.tipo}</td>
                                  <td class="td-number">${unidades}</td>
                                  <td class="td-number" style="font-size: 11px;">${pesosBrutos}</td>
                                  <td class="td-number" style="font-weight: bold; color: #047857;">${pesoNeto}</td>
                                  <td class="td">${fecha}</td>
                                </tr>
                              `;
                            });

                            htmlContent += `
                                  </tbody>
                                </table>
                              </body>
                              </html>
                            `;

                            const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", `proyecciones_fabrica${exportMonth ? `_${exportMonth}` : ''}.xls`);
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
              return items.map(prod => {
                const isHelado = prod.categoria === 'helados';
                const qtyPend = prod.cantidad_pendiente;
                const qtyStock = prod.stock_fabrica || 0;
                const qtyDiff = Math.max(0, qtyPend - qtyStock);
                return <tr key={prod.producto_id}>
                              <td><strong>{prod.producto_nombre}</strong></td>
                              <td style={{ textTransform: 'capitalize' }}>{formatTipo(prod.tipo)}</td>
                              <td style={{ fontWeight: 600 }}>
                                {qtyPend} {prod.tipo ? 'u' : ''}
                                {isHelado && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>
                                  ({(qtyPend * getProductNetWeight(prod.producto_id, prod.tipo)).toFixed(1)} kg)
                                </span>}
                              </td>
                              <td>
                                {qtyStock}
                                {isHelado && qtyStock > 0 && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>
                                  ({(qtyStock * getProductNetWeight(prod.producto_id, prod.tipo)).toFixed(1)} kg)
                                </span>}
                              </td>
                              <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                                {qtyDiff}
                                {isHelado && qtyDiff > 0 && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--danger)', opacity: 0.8, fontWeight: 'normal' }}>
                                  ({(qtyDiff * getProductNetWeight(prod.producto_id, prod.tipo)).toFixed(1)} kg)
                                </span>}
                              </td>
                            </tr>;
              });
            })()}
                        {(!dashboardStats?.productionNeeded || dashboardStats.productionNeeded.length === 0) && <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                              El stock en Fábrica es suficiente para cubrir todos los pedidos activos.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card" style={{ flex: 1, marginBottom: '1.5rem' }}>
                  <h3 className="section-title">Historial de Fabricación Reciente (Lotes y Pesos)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
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
              const netKilos = l.pesos && l.pesos.length > 0 ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;
              const weightPerUnit = l.productos ? getProductNetWeight(l.productos.id, l.productos.tipo) : 0;
              return <tr key={l.id}>
                              <td><code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>{l.codigo_lote}</code></td>
                              <td><strong>{l.productos?.nombre}</strong></td>
                              <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{formatTipo(l.productos?.tipo)}</td>
                              <td>
                                <strong>{formatQuantity(l.cantidad, l.productos)}</strong>
                                {isHelado && (!l.pesos || l.pesos.length === 0) && (
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>
                                    ~{(l.cantidad * getProductNetWeight(l.productos.id, l.productos.tipo)).toFixed(1)} kg (Est.)
                                  </span>
                                )}
                              </td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? <span style={{ fontSize: '0.85rem' }}>
                                    {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                  </span> : <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>}
                              </td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? <strong style={{ color: 'var(--success)' }}>{netKilos.toFixed(2)} kg</strong> : isHelado ? <span style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>~{(l.cantidad * getProductNetWeight(l.productos.id, l.productos.tipo)).toFixed(2)} kg (Est.)</span> : <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>}
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{formatDate()}</td>
                            </tr>;
            })}
                        {recentLotes.length === 0 && <tr>
                            <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                              No hay lotes de producción registrados.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>;
};
export default AdminProjectionsView;