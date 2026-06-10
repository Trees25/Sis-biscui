import { useData } from '../../context/DataContext';
import React from 'react';
const EditStockModal = () => {
  const {
    setShowEditStockModal,
    handleSaveStockAdmin,
    editStockItemDetails,
    formatTipo,
    editStockForm,
    setEditStockForm,
    loading
  } = useData();
  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '1rem',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  }}>
            <div className="glass-card" style={{
      maxWidth: '400px',
      width: '100%',
      background: 'rgba(255, 255, 255, 0.98)',
      color: '#000'
    }}>
              <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        paddingBottom: '0.8rem'
      }}>
                <h3 style={{
          margin: 0,
          color: 'var(--text-dark)',
          fontFamily: 'Outfit'
        }}>Editar Stock</h3>
                <button className="btn btn-outline btn-sm" style={{
          borderColor: 'rgba(0,0,0,0.2)',
          color: 'var(--text-dark)'
        }} onClick={() => setShowEditStockModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveStockAdmin}>
                <div style={{
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
                  <strong>Producto:</strong> {editStockItemDetails.producto_nombre} <span style={{
            color: 'var(--text-light)',
            fontSize: '0.8rem'
          }}>({formatTipo(editStockItemDetails.tipo)})</span><br />
                  <strong>Sucursal:</strong> {editStockItemDetails.sucursal_nombre}<br />
                  <strong>Tipo de Stock:</strong> {editStockForm.es_evento ? 'Eventos' : 'Común'}
                </div>
                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Cantidad Actualizada</label>
                  <input type="number" className="form-control" value={editStockForm.cantidad} onChange={e => setEditStockForm({
            ...editStockForm,
            cantidad: e.target.value
          })} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }} min="0" />
                </div>
                <button type="submit" className="btn btn-primary" style={{
          width: '100%'
        }} disabled={loading}>
                  Guardar Stock
                </button>
              </form>
            </div>
          </div>;
};
export default EditStockModal;