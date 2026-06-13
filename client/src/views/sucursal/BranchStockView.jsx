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
    setBranchStockSearch
  } = useData();

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
            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
              {cat.nombre}
            </h4>
            <div className="items-grid">
              {catProds.map(p => {
                const sData = stockData.find(s => s.producto_id === p.id && s.sucursal_id === user.sucursal_id && s.es_evento === false);
                const cantidad = sData ? sData.cantidad : 0;
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
                    <span className={`badge ${cantidad > 0 ? 'badge-activo' : 'badge-inactivo'}`} style={{
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem'
              }}>
                      {cantidad > 0 ? 'En Stock' : 'Sin Stock'}
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
                  <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: cantidad > 0 ? 'var(--text-dark)' : 'var(--danger)',
              marginBottom: '0.5rem'
            }}>
                    {formatQuantity(cantidad, p)}
                  </div>
                </div>
              })}
            </div>
          </div>;
    })}
    </div>;
};
export default BranchStockView;