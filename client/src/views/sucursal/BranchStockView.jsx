import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity, normalizeWeight, getTareByTipo, calculateNetWeight } from '../../utils/formatters';

const BranchStockView = () => {
  const {
    categories,
    productos,
    stockData,
    user,
    branchStockSearch,
    setBranchStockSearch,
    sucursales,
    handleSaveInventory,
    showToast
  } = useData();

  const myBranch = (sucursales || []).find(s => s.id === user?.sucursal_id);
  const canTakeInventory = myBranch?.inventario_habilitado;

  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({});

  const [branchStockCategoryFilter, setBranchStockCategoryFilter] = useState('Todos');
  const [branchStockFormatFilter, setBranchStockFormatFilter] = useState('Todos');

  const onSave = () => {
    const items = Object.entries(inventoryForm)
      .filter(([_, val]) => val !== '' && val !== null && !isNaN(Number(val.toString().replace(',', '.'))) && Number(val.toString().replace(',', '.')) !== 0)
      .map(([pId, addVal]) => {
        const prod = productos.find(x => x.id === Number(pId));
        const isW = prod?.unidad_medida === 'peso' || prod?.categoria === 'helados';
        const sData = stockData.find(s => s.producto_id === Number(pId) && s.sucursal_id === user.sucursal_id && s.es_evento === false);
        const current = sData ? Number(sData.cantidad) : 0;
        
        let addedNet = 0;
        if (isW) {
          const calc = calculateNetWeight(addVal, prod?.tipo, true);
          addedNet = calc.net;
        } else {
          addedNet = Number(addVal);
        }
        
        const finalQty = isW ? Number((current + addedNet).toFixed(3)) : (current + addedNet);
        return { producto_id: Number(pId), cantidad: finalQty };
      });

    if (items.length === 0) {
      showToast('No ingresaste cantidades para sumar al stock.', 'warning');
      return;
    }

    handleSaveInventory(items).then(() => {
      setInventoryForm({});
      setInventoryMode(false);
    });
  };

  return <div className="glass-card">
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
          }}>Stock Actual en mi Sucursal</h3>
          {inventoryMode && (
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Ingresa el peso bruto de balanza (ej: <strong>5600</strong> = 5.600 kg). El sistema <strong>descuenta automáticamente la tara del envase</strong> (vasqueta o balde) y lo suma al stock actual.
            </p>
          )}
        </div>
        
        {canTakeInventory && !inventoryMode && (
          <button className="btn btn-primary btn-sm" onClick={() => {
            setInventoryForm({});
            setInventoryMode(true);
          }}>
            📋 Agregar / Hacer Inventario
          </button>
        )}
        {inventoryMode && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={() => {
              setInventoryForm({});
              setInventoryMode(false);
            }}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={onSave}>
              Guardar Inventario
            </button>
          </div>
        )}
      </div>

      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flex: '1 1 200px'
      }}>
          <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)'
        }}>Buscar:</span>
          <input type="text" className="form-control" placeholder="🔍 Buscar por nombre..." value={branchStockSearch} onChange={e => setBranchStockSearch(e.target.value)} />
        </div>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flex: '1 1 200px'
      }}>
          <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)'
        }}>Categoría:</span>
          <select className="form-control" value={branchStockCategoryFilter} onChange={e => setBranchStockCategoryFilter(e.target.value)}>
            <option value="Todos">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {branchStockCategoryFilter === 'helados' && <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flex: '1 1 200px'
      }}>
            <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-light)'
        }}>Formato:</span>
            <select className="form-control" value={branchStockFormatFilter} onChange={e => setBranchStockFormatFilter(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Vasqueta">Vasqueta</option>
              <option value="Balde">Balde (5L/10L)</option>
            </select>
          </div>}
      </div>

      {categories.filter(cat => branchStockCategoryFilter === 'Todos' || cat.id === branchStockCategoryFilter).map(cat => {
      let catProds = productos.filter(p => p.categoria === cat.id);
      if (branchStockSearch) {
        catProds = catProds.filter(p => p.nombre.toLowerCase().includes(branchStockSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(branchStockSearch.toLowerCase()));
      }
      if (cat.id === 'helados' && branchStockFormatFilter !== 'Todos') {
        if (branchStockFormatFilter === 'Vasqueta') {
          catProds = catProds.filter(p => p.tipo === 'vasqueta_5_6k');
        } else if (branchStockFormatFilter === 'Balde') {
          catProds = catProds.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
        }
      }
      if (catProds.length === 0) return null;
      return <div key={cat.id} style={{
        marginBottom: '2rem'
      }}>
            <h4 style={{
          marginBottom: '1rem',
          borderBottom: '2px solid rgba(0,0,0,0.05)',
          paddingBottom: '0.5rem',
          color: 'var(--primary)'
        }}>
              {cat.name}
            </h4>
            <div className="items-grid">
              {catProds.map(p => {
                const sData = (stockData || []).find(s => s.producto_id === p.id && s.sucursal_id === user?.sucursal_id && s.es_evento === false);
                const cantidadActual = sData ? Number(sData.cantidad) : 0;
                const isWeight = p.unidad_medida === 'peso' || p.categoria === 'helados';
                const tareVal = getTareByTipo(p.tipo);
                const enteredVal = inventoryForm[p.id];
                
                const calc = isWeight ? calculateNetWeight(enteredVal, p.tipo, true) : { gross: Number(enteredVal || 0), tare: 0, net: Number(enteredVal || 0) };
                const hasInput = enteredVal !== undefined && enteredVal !== '' && !isNaN(Number(enteredVal.toString().replace(',', '.'))) && calc.gross > 0;
                const newTotal = isWeight ? Number((cantidadActual + calc.net).toFixed(3)) : (cantidadActual + calc.net);

                return <div key={p.id} className="glass-card" style={{
            padding: '1.2rem',
            textAlign: 'center',
            position: 'relative',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
                  <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px'
            }}>
                    <span className={`badge ${cantidadActual > 0 ? 'badge-activo' : 'badge-inactivo'}`} style={{
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem'
              }}>
                      {cantidadActual > 0 ? 'En Stock' : 'Sin Stock'}
                    </span>
                  </div>
                  <h4 style={{
              margin: '1rem 0 0.5rem 0',
              fontSize: '1.1rem'
            }}>{p.nombre}</h4>
                  <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-light)',
              marginBottom: '0.4rem',
              textTransform: 'capitalize'
            }}>
                    {formatTipo(p.tipo)} {tareVal > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>• Tara: {tareVal.toFixed(3)} kg</span>}
                  </div>
                  
                  {inventoryMode ? (
                    <div style={{ marginTop: '0.5rem', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '4px' }}>
                        Stock actual: <strong>{formatQuantity(cantidadActual, { ...p, unidad_medida: isWeight ? 'peso' : p.unidad_medida })}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>+</span>
                        <input 
                          type="number" 
                          step={isWeight ? "0.001" : "1"}
                          className="form-control text-center" 
                          value={enteredVal !== undefined ? enteredVal : ''} 
                          placeholder={isWeight ? "Peso bruto (ej. 5600)" : "Ej. 5"}
                          onChange={e => setInventoryForm({ ...inventoryForm, [p.id]: e.target.value })}
                          onBlur={e => {
                            if (isWeight && e.target.value !== '') {
                              const norm = normalizeWeight(e.target.value);
                              setInventoryForm({ ...inventoryForm, [p.id]: norm });
                            }
                          }}
                          style={{ fontSize: '1.1rem', fontWeight: 'bold', flex: 1 }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)' }}>
                          {isWeight ? 'kg' : 'u'}
                        </span>
                      </div>
                      {hasInput ? (
                        <div style={{ 
                          marginTop: '6px', 
                          fontSize: '0.78rem', 
                          padding: '4px 8px', 
                          background: 'rgba(46, 204, 113, 0.15)', 
                          color: '#27ae60', 
                          borderRadius: '6px', 
                          fontWeight: 600,
                          textAlign: 'center'
                        }}>
                          {tareVal > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dark)', marginBottom: '2px' }}>
                              Bruto: {calc.gross.toFixed(3)} kg - Tara ({tareVal.toFixed(3)} kg) = <strong>Neto: +{calc.net.toFixed(3)} kg</strong>
                            </div>
                          )}
                          ➡️ Nuevo Total: {formatQuantity(newTotal, { ...p, unidad_medida: isWeight ? 'peso' : p.unidad_medida })}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center' }}>
                          Sin cambios
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: cantidadActual > 0 ? 'var(--text-dark)' : 'var(--danger)',
                      marginBottom: '0.5rem'
                    }}>
                      {formatQuantity(cantidadActual, { ...p, unidad_medida: p.categoria === 'helados' ? 'peso' : p.unidad_medida })}
                    </div>
                  )}
                </div>
              })}
            </div>
          </div>;
    })}
    </div>;
};
export default BranchStockView;