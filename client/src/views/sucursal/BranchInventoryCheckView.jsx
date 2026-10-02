import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
import { formatQuantityShort } from '../../utils/formatters';

const BranchInventoryCheckView = () => {
  const { stockData, productos, categories, user, showToast, fetchData } = useData();
  const [adjustedStock, setAdjustedStock] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Todos');

  const myStock = (stockData || []).filter(s => s.sucursal_id === user.sucursal_id);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      for (const [prodIdStr, realQty] of Object.entries(adjustedStock)) {
        if (realQty === '' || realQty === undefined || realQty === null) continue;
        const pId = parseInt(prodIdStr);
        const currentStockItem = myStock.find(s => s.producto_id === pId);
        const currentQty = currentStockItem ? currentStockItem.cantidad : 0;
        
        const diff = Number(realQty) - Number(currentQty);
        
        if (diff !== 0) {
          if (currentStockItem) {
            const { error: updErr } = await supabase.from('stock_sucursales')
              .update({ cantidad: realQty })
              .eq('sucursal_id', user.sucursal_id)
              .eq('producto_id', pId)
              .eq('es_evento', false);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase.from('stock_sucursales').insert({
              sucursal_id: user.sucursal_id,
              producto_id: pId,
              cantidad: realQty,
              es_evento: false
            });
            if (insErr) throw insErr;
          }

          // Register Audit Log
          const { error: auditErr } = await supabase.from('historial_movimientos').insert({
            sucursal_id: user.sucursal_id,
            producto_id: pId,
            tipo_movimiento: diff > 0 ? 'sobrante_inventario' : 'merma_inventario',
            cantidad: diff,
            stock_resultante: realQty,
            detalle: 'Ajuste semanal de inventario'
          });
          if (auditErr) throw auditErr;
        }
      }

      showToast('Inventario ajustado y guardado correctamente.');
      setAdjustedStock({});
      fetchData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Control de Inventario Semanal</h2>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleSubmit} 
          disabled={loading || Object.keys(adjustedStock).length === 0}
        >
          Guardar Ajuste de Inventario
        </button>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar:</span>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Chocolate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Categoría:</span>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {selectedCategory === 'helados' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Formato:</span>
              <select
                className="form-control"
                value={selectedFormat}
                onChange={e => setSelectedFormat(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Vasqueta">Vasqueta</option>
                <option value="Balde">Balde (5L/10L)</option>
              </select>
            </div>
          )}
        </div>
        <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
          Ingresa el peso o cantidad real que marca la balanza/conteo. El sistema calculará la diferencia y ajustará tu stock actual. Deja en blanco los que no quieras ajustar.
        </p>

        <div className="table-container" style={{ marginBottom: '1.5rem' }}>
          <table>
            <thead>
              <tr>
                <th>Producto / Sabor</th>
                <th style={{ textAlign: 'center' }}>Stock Teórico (Sistema)</th>
                <th style={{ textAlign: 'center', width: '220px' }}>Stock Real (Balanza)</th>
              </tr>
            </thead>
            <tbody>
              {productos.filter(p => {
                if (selectedCategory && p.categoria !== selectedCategory) return false;
                if (searchQuery && !p.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                
                if (selectedCategory === 'helados' && selectedFormat !== 'Todos') {
                  if (selectedFormat === 'Vasqueta' && p.tipo !== 'vasqueta_5_6k') return false;
                  if (selectedFormat === 'Balde' && p.tipo !== 'balde_4k' && p.tipo !== 'balde_8k') return false;
                }
                
                return true;
              }).map(prod => {
                const stockItem = myStock.find(s => s.producto_id === prod.id);
                const currentQty = stockItem ? stockItem.cantidad : 0;

                return (
                  <tr key={prod.id}>
                    <td><strong>{prod.nombre}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>({prod.categoria})</span></td>
                    <td style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                      {formatQuantityShort(currentQty, prod)}
                    </td>
                    <td>
                      <UnitCalculatorInput
                        value={adjustedStock[prod.id] !== undefined ? adjustedStock[prod.id] : ''}
                        onChange={val => setAdjustedStock(prev => ({ ...prev, [prod.id]: val }))}
                        product={prod}
                        placeholder="Cantidad Real"
                        min={0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={loading || Object.keys(adjustedStock).length === 0}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
        >
          Guardar Ajuste de Inventario
        </button>
      </div>
    </div>
  );
};

export default BranchInventoryCheckView;
