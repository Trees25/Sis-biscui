import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../../components/common/UnitCalculatorInput';
const BranchConsumptionView = () => {
  const {
    handleConsumoSubmit,
    sucursalConsumoSearch,
    setSucursalConsumoSearch,
    consumoForm,
    productos,
    setConsumoForm,
    categories,
    formatTipo,
    getProductOptionLabel,
    loading
  } = useData();
  return <div className="glass-card" style={{
    maxWidth: '480px'
  }}>
                <h3 className="section-title">Registrar Consumo / Venta</h3>
                <p style={{
      fontSize: '0.85rem',
      color: 'var(--text-light)',
      marginBottom: '1.2rem'
    }}>
                  Resta stock local cuando consumas o vendas un producto. Esto entrenará las sugerencias de tus futuros pedidos.
                </p>
                <form onSubmit={handleConsumoSubmit}>
                  <div className="form-group">
                    <label>Seleccionar Sabor / Producto</label>
                    <input type="text" className="form-control" placeholder="🔍 Filtrar productos por nombre..." value={sucursalConsumoSearch} onChange={e => setSucursalConsumoSearch(e.target.value)} style={{
          marginBottom: '0.6rem',
          padding: '0.6rem 1rem',
          fontSize: '0.95rem',
          borderRadius: '10px',
          background: 'var(--input-bg)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          color: 'var(--text-dark)',
          width: '100%'
        }} />
                    <select className="form-control" value={consumoForm.producto_id} onChange={e => {
          const pId = e.target.value;
          const selectedProd = productos.find(p => p.id === parseInt(pId));
          const isVasqueta = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
          setConsumoForm({
            ...consumoForm,
            producto_id: pId,
            es_evento: isVasqueta ? false : consumoForm.es_evento
          });
        }} required>
                      <option value="">-- Seleccionar --</option>
                      {categories.map(cat => {
            let catProds = productos.filter(p => p.categoria === cat.id);
            if (sucursalConsumoSearch) {
              catProds = catProds.filter(p => p.nombre.toLowerCase().includes(sucursalConsumoSearch.toLowerCase()) || p.tipo && formatTipo(p.tipo).toLowerCase().includes(sucursalConsumoSearch.toLowerCase()));
            }
            if (catProds.length === 0) return null;
            return <optgroup key={cat.id} label={cat.name}>
                            {catProds.map(p => <option key={p.id} value={p.id}>{getProductOptionLabel(p)}</option>)}
                          </optgroup>;
          })}
                    </select>
                  </div>

                  {/* Event Checkbox removed for sucursales */}

                  <div className="form-group">
                    <label>Cantidad Consumida</label>
                    <UnitCalculatorInput value={consumoForm.cantidad} onChange={val => setConsumoForm({
          ...consumoForm,
          cantidad: val
        })} product={productos.find(p => p.id === parseInt(consumoForm.producto_id))} placeholder="Ej. 2" min={1} />
                  </div>
                  <button type="submit" className="btn btn-danger" disabled={loading}>
                    Registrar Consumo y Restar de Stock
                  </button>
                </form>
              </div>;
};
export default BranchConsumptionView;