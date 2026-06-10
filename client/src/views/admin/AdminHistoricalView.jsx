import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const AdminHistoricalView = () => {
  const {
    histCargaMode,
    setHistCargaMode,
    handleAdminHistSubmit,
    adminHistForm,
    productos,
    getProductOptionLabel,
    formatTipo,
    setAdminHistForm,
    setAdminHistWeights,
    adminHistSearch,
    setAdminHistSearch,
    String,
    adminHistDefaultWeight,
    getTareByTipo,
    setAdminHistDefaultWeight,
    adminHistWeights,
    loading,
    histBulkCategory,
    setHistBulkCategory,
    categories,
    handleDownloadHistTemplate,
    handleUploadHistTemplate,
    recentLotes,
    formatQuantity
  } = useData();
  return <div className="dashboard-grid">
                <div className="glass-card" style={{
      maxWidth: '500px'
    }}>
                  <h3 className="section-title">Carga de Producción Histórica / Pre-Sistema</h3>
                  <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        marginBottom: '1.2rem'
      }}>
                    Registra producciones anteriores al sistema para inicializar el stock en fábrica y mantener la trazabilidad de lotes y pesos.
                  </p>
                  <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: 'rgba(0,0,0,0.03)',
        padding: '4px',
        borderRadius: '10px'
      }}>
                    <button type="button" className={`btn btn-sm ${histCargaMode === 'individual' ? 'btn-primary' : 'btn-outline'}`} style={{
          flex: 1,
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem',
          minHeight: 'unset',
          fontSize: '0.85rem',
          fontWeight: 600
        }} onClick={() => setHistCargaMode('individual')}>
                      Individual
                    </button>
                    <button type="button" className={`btn btn-sm ${histCargaMode === 'masiva' ? 'btn-primary' : 'btn-outline'}`} style={{
          flex: 1,
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem',
          minHeight: 'unset',
          fontSize: '0.85rem',
          fontWeight: 600
        }} onClick={() => setHistCargaMode('masiva')}>
                      Carga Masiva (Excel)
                    </button>
                  </div>

                  {histCargaMode === 'individual' ? <form onSubmit={handleAdminHistSubmit}>
                      <div className="form-group" style={{
          position: 'relative'
        }}>
                        <label>Seleccionar Producto / Sabor</label>
                        {adminHistForm.producto_id ? <div style={{
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
                                Helado Seleccionado
                              </span>
                              <span style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-dark)'
              }}>
                                {productos.find(p => p.id === parseInt(adminHistForm.producto_id)) ? getProductOptionLabel(productos.find(p => p.id === parseInt(adminHistForm.producto_id))) : 'Cargando...'}
                              </span>
                              <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-light)',
                marginLeft: '8px'
              }}>
                                ({productos.find(p => p.id === parseInt(adminHistForm.producto_id)) ? formatTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo) : ''})
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
              setAdminHistForm({
                ...adminHistForm,
                producto_id: ''
              });
              setAdminHistWeights([]);
            }}>
                              Cambiar
                            </button>
                          </div> : <>
                            <input type="text" className="form-control" placeholder="🔍 Buscar helado por nombre..." value={adminHistSearch} onChange={e => setAdminHistSearch(e.target.value)} style={{
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
                if (p.categoria !== 'helados') return false;
                if (!adminHistSearch) return true;
                const searchLower = adminHistSearch.toLowerCase();
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
                  setAdminHistForm({
                    ...adminHistForm,
                    producto_id: String(p.id),
                    cantidad: '',
                    es_evento: isVasqueta ? false : adminHistForm.es_evento
                  });
                  setAdminHistWeights([]);
                  setAdminHistSearch('');
                }} style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'background-color 0.2s',
                  fontSize: '0.95rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsl(210, 20%, 95%)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <span style={{
                    fontWeight: 600,
                    color: 'var(--text-dark)'
                  }}>{p.nombre}</span>
                                      <span style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-light)',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}>
                                        {formatTipo(p.tipo)}
                                      </span>
                                    </div>)}
                                </div> : <div style={{
                padding: '1rem',
                fontSize: '0.9rem',
                color: 'var(--text-light)',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '10px',
                marginTop: '0.2rem'
              }}>
                                  No se encontraron helados
                                </div>;
            })()}
                          </>}
                      </div>

                      <div className="form-group">
                        <label>Fecha de Fabricación Histórica</label>
                        <input type="date" className="form-control" value={adminHistForm.fecha} onChange={e => setAdminHistForm({
            ...adminHistForm,
            fecha: e.target.value
          })} required />
                      </div>

                      {/* Event Checkbox */}
                      {(() => {
          const selectedProd = productos.find(p => p.id === parseInt(adminHistForm.producto_id));
          const isVasqueta = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
          if (!selectedProd || isVasqueta) return null;
          return <div className="form-group" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0.8rem 0'
          }}>
                            <input type="checkbox" id="adminHistEsEvento" checked={adminHistForm.es_evento} onChange={e => setAdminHistForm({
              ...adminHistForm,
              es_evento: e.target.checked
            })} style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }} />
                            <label htmlFor="adminHistEsEvento" style={{
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
                        <UnitCalculatorInput value={adminHistForm.cantidad} onChange={val => {
            setAdminHistForm({
              ...adminHistForm,
              cantidad: val
            });
            const qty = parseInt(val) || 0;
            setAdminHistWeights(prev => {
              const next = [...prev];
              if (next.length < qty) {
                while (next.length < qty) next.push(adminHistDefaultWeight || '');
              } else if (next.length > qty) {
                next.splice(qty);
              }
              return next;
            });
          }} product={productos.find(p => p.id === parseInt(adminHistForm.producto_id))} placeholder="Ej. 5" min={1} />
                      </div>

                      {/* Weight Inputs for Helado */}
                      {productos.find(p => p.id === parseInt(adminHistForm.producto_id)) && parseInt(adminHistForm.cantidad) > 0 && <div style={{
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
            }}>{formatTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{
              color: 'var(--text-dark)'
            }}>{getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo).toFixed(3)} kg</strong>
                          </div>

                          {/* Autofill helper input for bulk entry */}
                          <div className="form-group" style={{
            marginBottom: '1.2rem',
            paddingBottom: '0.8rem',
            borderBottom: '1px solid rgba(0,0,0,0.06)'
          }}>
                            <label style={{
              fontSize: '0.8rem',
              marginBottom: '4px',
              display: 'block',
              fontWeight: 600
            }}>
                              Autocompletar Peso Bruto Unitario (kg)
                            </label>
                            <div style={{
              display: 'flex',
              gap: '0.5rem'
            }}>
                              <input type="number" step="0.001" min="0.001" className="form-control" style={{
                padding: '0.35rem 0.5rem',
                fontSize: '0.85rem'
              }} placeholder="Ej. 6.120" value={adminHistDefaultWeight} onChange={e => {
                const val = e.target.value;
                setAdminHistDefaultWeight(val);
                if (val) {
                  const qty = parseInt(adminHistForm.cantidad) || 0;
                  setAdminHistWeights(Array(qty).fill(val));
                }
              }} />
                              {adminHistDefaultWeight && <button type="button" className="btn btn-secondary" style={{
                padding: '0.35rem 0.8rem',
                fontSize: '0.75rem',
                height: 'auto',
                whiteSpace: 'nowrap',
                minHeight: 'unset',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--text)'
              }} onClick={() => {
                setAdminHistDefaultWeight('');
                setAdminHistWeights(Array(parseInt(adminHistForm.cantidad) || 0).fill(''));
              }}>
                                  Limpiar
                                </button>}
                            </div>
                            <span style={{
              fontSize: '0.7rem',
              color: 'var(--text-light)',
              display: 'block',
              marginTop: '4px'
            }}>
                              Ingresa un peso bruto aquí para rellenar automáticamente todas las unidades y evitar cargarlas una por una.
                            </span>
                          </div>
                          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.6rem',
            maxHeight: '200px',
            overflowY: 'auto',
            paddingRight: '0.2rem'
          }}>
                            {adminHistWeights.map((w, idx) => {
              const tare = getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo);
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
                  const next = [...adminHistWeights];
                  next[idx] = e.target.value;
                  setAdminHistWeights(next);
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
                            <span><strong>Total Bruto:</strong> {adminHistWeights.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0).toFixed(3)} kg</span>
                            <span><strong>Total Neto:</strong> {adminHistWeights.reduce((acc, curr) => acc + Math.max(0, (parseFloat(curr) || 0) - getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)), 0).toFixed(3)} kg</span>
                          </div>
                        </div>}

                      <button type="submit" className="btn btn-primary" style={{
          marginTop: '1rem',
          width: '100%'
        }} disabled={loading || !adminHistForm.producto_id}>
                        Cargar Producción Pre-Sistema
                      </button>
                    </form> : <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem'
      }}>
                      <div>
                        <h4 style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            marginBottom: '0.4rem'
          }}>
                          1. Descargar Plantilla por Categoría
                        </h4>
                        <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            marginBottom: '0.8rem'
          }}>
                          Selecciona una categoría para generar una plantilla CSV precargada con todos sus productos activos.
                        </p>
                        <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.8rem'
          }}>
                          <select className="form-control" value={histBulkCategory} onChange={e => setHistBulkCategory(e.target.value)} style={{
              borderRadius: '10px',
              background: 'var(--input-bg)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: 'var(--text-dark)',
              fontSize: '0.95rem',
              flex: 1,
              padding: '0.5rem',
              height: 'auto',
              minHeight: 'unset'
            }}>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                          <button type="button" className="btn btn-secondary" onClick={handleDownloadHistTemplate} style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              height: 'auto',
              minHeight: 'unset'
            }}>
                            📥 Descargar
                          </button>
                        </div>
                      </div>

                      <div style={{
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          paddingTop: '1.2rem',
          marginTop: '0.4rem'
        }}>
                        <h4 style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            marginBottom: '0.4rem'
          }}>
                          2. Subir Planilla Completada
                        </h4>
                        <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            marginBottom: '1rem',
            lineHeight: '1.4'
          }}>
                          Sube la planilla completada en formato CSV. Las filas con cantidad mayor a 0 se registrarán como lotes de producción histórica.
                          <br />
                          💡 <strong>Múltiples pesos de helados:</strong> Si la cantidad es mayor a 1, puedes indicar los pesos brutos individuales separados por espacios, barras o punto y coma (ej: <code>8,120; 8,250; 8,180</code>) en la columna de peso unitario.
                        </p>
                        
                        <div style={{
            border: '2px dashed hsl(24, 85%, 55%)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            background: 'hsla(24, 85%, 55%, 0.02)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'var(--transition)'
          }}>
                          <span style={{
              fontSize: '2rem',
              display: 'block',
              marginBottom: '0.5rem'
            }}>📄</span>
                          <span style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-dark)',
              display: 'block'
            }}>
                            {loading ? 'Procesando planilla...' : 'Haga clic para seleccionar el archivo CSV'}
                          </span>
                          <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              marginTop: '0.2rem',
              display: 'block'
            }}>
                            Formatos aceptados: .csv (delimitado por coma o punto y coma)
                          </span>
                          <input type="file" accept=".csv" onChange={handleUploadHistTemplate} disabled={loading} style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }} />
                        </div>
                      </div>
                    </div>}
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Lotes Cargados Históricamente</h3>
                  <div className="table-container" style={{
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Cant.</th>
                          <th>Fecha Fabricación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes.filter(l => l.productos && l.productos.categoria === 'helados').map(l => {
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
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>;
};
export default AdminHistoricalView;