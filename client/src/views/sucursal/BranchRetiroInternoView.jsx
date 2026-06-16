import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo } from '../../utils/formatters';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
const BranchRetiroInternoView = () => {
  const {
    productos,
    stockData,
    categories,
    retiroItems,
    setRetiroItems,
    handleRetiroInternoSubmit,
    loading,
    branchRetiroSearch,
    setBranchRetiroSearch,
    branchRetiroCategoryFilter,
    setBranchRetiroCategoryFilter
  } = useData();
  return <div className="glass-card fade-in">
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
        <h3 className="section-title" style={{
        margin: 0,
        border: 'none'
      }}>Retiro Interno (Autoabastecimiento)</h3>
        <button className="btn btn-primary" onClick={handleRetiroInternoSubmit} disabled={loading}>
          {loading ? 'Procesando...' : 'Confirmar Retiro'}
        </button>
      </div>
      <p style={{
      color: 'var(--text-light)',
      fontSize: '0.9rem',
      marginBottom: '1.5rem'
    }}>
        Selecciona los insumos que vas a retirar físicamente de la Fábrica. Al confirmar, el stock se descontará automáticamente de la Fábrica y se sumará a Casa Central.
      </p>

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
        }}>Buscar producto:</span>
          <input type="text" className="form-control" placeholder="🔍 Buscar por nombre..." value={branchRetiroSearch} onChange={e => setBranchRetiroSearch(e.target.value)} />
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
          <select className="form-control" value={branchRetiroCategoryFilter} onChange={e => setBranchRetiroCategoryFilter(e.target.value)}>
            <option value="Todos">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Producto / Sabor</th>
              <th>Stock Fábrica (Disponible)</th>
              <th>Cantidad a Retirar</th>
            </tr>
          </thead>
          <tbody>
            {productos.filter(p => branchRetiroCategoryFilter === 'Todos' || p.categoria === branchRetiroCategoryFilter).filter(p => {
            if (!branchRetiroSearch) return true;
            return p.nombre.toLowerCase().includes(branchRetiroSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(branchRetiroSearch.toLowerCase());
          }).map(p => {
            // For Retiro Interno, we want to know how much FACTORY stock is available
            // Factory is sucursal_id = 1
            const stockFab = stockData.find(s => s.producto_id === p.id && s.sucursal_id === 1)?.cantidad || 0;
            return <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong><br />
                      <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-light)'
                }}>{formatTipo(p.tipo)}</span>
                    </td>
                    <td style={{
                color: stockFab > 0 ? 'var(--success)' : 'var(--danger)',
                fontWeight: 600
              }}>
                      {stockFab} {p.unidad_medida === 'peso' ? 'kg' : 'u'}
                    </td>
                    <td>
                      <UnitCalculatorInput value={retiroItems[p.id] || ''} onChange={val => {
                  if (val > stockFab) {
                    // Optional: warn the user or just allow it if they really want to negative stock
                  }
                  setRetiroItems(prev => ({
                    ...prev,
                    [p.id]: val
                  }));
                }} product={p} />
                    </td>
                  </tr>;
          })}
          </tbody>
        </table>
      </div>
    </div>;
};
export default BranchRetiroInternoView;