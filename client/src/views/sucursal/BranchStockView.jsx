import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity } from '../../utils/formatters';
const BranchStockView = () => {
  const {
    categories,
    productos,
    stockData,
    user,
    branchStockSearch,
    setBranchStockSearch,
    sucursales,
    handleSaveInventory
  } = useData();

  const myBranch = sucursales.find(s => s.id === user.sucursal_id);
  const canTakeInventory = myBranch?.inventario_habilitado;

  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({});

  const [branchStockCategoryFilter, setBranchStockCategoryFilter] = useState('Todos');
  const [branchStockFormatFilter, setBranchStockFormatFilter] = useState('Todos');

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
      }}>Stock Actual en mi Sucursal</h3>
        
        {canTakeInventory && !inventoryMode && (
          <button className="btn btn-primary btn-sm" onClick={() => {
            const form = {};
            productos.forEach(p => {
              const sData = stockData.find(s => s.producto_id === p.id && s.sucursal_id === user.sucursal_id && s.es_evento === false);
              form[p.id] = sData ? sData.cantidad : 0;
            });
            setInventoryForm(form);
            setInventoryMode(true);
          }}>
            📋 Hacer Inventario
          </button>
        )}
        {inventoryMode && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setInventoryMode(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={() => {
               const items = Object.entries(inventoryForm).map(([pId, qty]) => ({ producto_id: Number(pId), cantidad: qty }));
               handleSaveInventory(items).then(() => setInventoryMode(false));
            }}>Guardar Inventario</button>
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
      // Filter out factory stock! Only show user.sucursal_id
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
                const sData = stockData.find(s => s.producto_id === p.id && s.sucursal_id === user.sucursal_id && s.es_evento === false);
                const cantidadActual = sData ? sData.cantidad : 0;
                const cantidadInput = inventoryForm[p.id] !== undefined ? inventoryForm[p.id] : cantidadActual;

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
              marginBottom: '1rem',
              textTransform: 'capitalize'
            }}>
                    {formatTipo(p.tipo)}
                  </div>
                  
                  {inventoryMode ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <input 
                        type="number" 
                        step={p.unidad_medida === 'peso' ? "0.01" : "1"}
                        className="form-control text-center" 
                        value={cantidadInput} 
                        onChange={e => setInventoryForm({ ...inventoryForm, [p.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: cantidadActual > 0 ? 'var(--text-dark)' : 'var(--danger)',
                      marginBottom: '0.5rem'
                    }}>
                      {formatQuantity(cantidadActual, p)}
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