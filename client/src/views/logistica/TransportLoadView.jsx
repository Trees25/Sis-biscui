import { useData } from '../../context/DataContext';
import React from 'react';
const TransportLoadView = () => {
  const {
    handleTranspCargaSubmit,
    transpCargaForm,
    setTranspCargaForm,
    proveedores,
    productos,
    getLocalDateString,
    loading
  } = useData();
  return <div className="glass-card fade-in">
                <h3 className="section-title">Ingreso de Mercadería a Fábrica</h3>
                <form onSubmit={handleTranspCargaSubmit} className="form-grid">
                  <div className="form-group">
                    <label>Proveedor</label>
                    <select className="form-control" value={transpCargaForm.proveedor_id} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          proveedor_id: e.target.value,
          producto_id: ''
        })} required>
                      <option value="">-- Seleccionar Proveedor --</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Producto / Insumo</label>
                    <select className="form-control" value={transpCargaForm.producto_id} onChange={e => setTranspCargaForm({
          ...transpCargaForm,
          producto_id: e.target.value
        })} required disabled={!transpCargaForm.proveedor_id}>
                      <option value="">-- Seleccione un producto --</option>
                      {productos.filter(p => p.activo === 1 && p.proveedor_id === parseInt(transpCargaForm.proveedor_id)).map(p => <option key={p.id} value={p.id}>
                            {p.nombre} ({p.tipo})
                          </option>)}
                      {productos.filter(p => p.activo === 1 && p.proveedor_id === parseInt(transpCargaForm.proveedor_id)).length === 0 && transpCargaForm.proveedor_id && <option value="" disabled>No hay productos registrados para este proveedor</option>}
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