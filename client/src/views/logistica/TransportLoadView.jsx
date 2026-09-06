import { useData } from '../../context/DataContext';
import React from 'react';

const TransportLoadView = () => {
  const {
    handleTranspCargaSubmit,
    transpCargaForm,
    setTranspCargaForm,
    proveedores,
    productos,
    categories,
    getLocalDateString,
    loading
  } = useData();

  const filteredProducts = productos.filter(p => {
    if (p.activo !== 1) return false;
    let matchProv = transpCargaForm.proveedor_id ? p.proveedor_id === parseInt(transpCargaForm.proveedor_id) : true;
    let matchCat = transpCargaForm.categoria_id ? p.categoria === transpCargaForm.categoria_id : true;
    return matchProv && matchCat;
  });

  const showProducts = !!(transpCargaForm.proveedor_id || transpCargaForm.categoria_id);

  return <div className="glass-card fade-in">
    <h3 className="section-title">Ingreso de Mercadería a Fábrica</h3>
    <form onSubmit={handleTranspCargaSubmit} className="form-grid">
      <div className="form-group">
        <label>Categoría (Opcional)</label>
        <select className="form-control" value={transpCargaForm.categoria_id || ''} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          categoria_id: e.target.value,
          producto_id: ''
        })}>
          <option value="">-- Todas las Categorías --</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Proveedor (Opcional)</label>
        <select className="form-control" value={transpCargaForm.proveedor_id || ''} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          proveedor_id: e.target.value,
          producto_id: ''
        })}>
          <option value="">-- Todos los Proveedores --</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Producto / Insumo</label>
        <select className="form-control" value={transpCargaForm.producto_id} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          producto_id: e.target.value
        })} required disabled={!showProducts}>
          <option value="">-- Seleccione un producto --</option>
          {showProducts && filteredProducts.map(p => <option key={p.id} value={p.id}>
                {p.nombre} ({p.tipo})
              </option>)}
          {showProducts && filteredProducts.length === 0 && <option value="" disabled>No hay productos para estos filtros</option>}
        </select>
      </div>
      <div className="form-group">
        <label>Cantidad ({productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? 'kg' : 'unidades'})</label>
        <input type="number" className="form-control" min={productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? "0.01" : "1"} step={productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? "0.01" : "1"} value={transpCargaForm.cantidad} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          cantidad: e.target.value
        })} required />
      </div>
      <div className="form-group">
        <label>Fecha de Recepción</label>
        <input type="date" className="form-control" value={transpCargaForm.fecha} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          fecha: e.target.value
        })} required max={getLocalDateString()} />
      </div>
      <div className="form-group" style={{
        gridColumn: '1 / -1'
      }}>
        <button type="submit" className="btn btn-primary" style={{
          width: '100%'
        }} disabled={loading || !transpCargaForm.producto_id}>
          {loading ? 'Procesando...' : 'Registrar Ingreso en Fábrica'}
        </button>
      </div>
    </form>
  </div>;
};

export default TransportLoadView;