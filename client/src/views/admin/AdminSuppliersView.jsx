import { useData } from '../../context/DataContext';
import React from 'react';
const AdminSuppliersView = () => {
  const {
    setEditingProv,
    setProvForm,
    setShowProvModal,
    proveedores,
    handleProvDelete,
    showProvModal,
    editingProv,
    handleProvSubmit,
    provForm,
    loading
  } = useData();
  return <div className="glass-card fade-in">
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
      }}>Gestión de Proveedores</h3>
                  <button className="btn btn-primary" onClick={() => {
        setEditingProv(null);
        setProvForm({
          nombre: '',
          cuit: '',
          telefono: '',
          direccion: '',
          email: ''
        });
        setShowProvModal(true);
      }}>
                    ➕ Nuevo Proveedor
                  </button>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>CUIT</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proveedores.map(p => <tr key={p.id}>
                          <td>{p.id}</td>
                          <td><strong>{p.nombre}</strong></td>
                          <td>{p.cuit || '-'}</td>
                          <td>{p.telefono || '-'}</td>
                          <td>{p.email || '-'}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{
                marginRight: '0.5rem'
              }} onClick={() => {
                setEditingProv(p);
                setProvForm({
                  nombre: p.nombre,
                  cuit: p.cuit || '',
                  telefono: p.telefono || '',
                  direccion: p.direccion || '',
                  email: p.email || ''
                });
                setShowProvModal(true);
              }}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleProvDelete(p.id, p.nombre)}>
                              Eliminar
                            </button>
                          </td>
                        </tr>)}
                      {proveedores.length === 0 && <tr>
                          <td colSpan="6" style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '2rem 1rem'
            }}>
                            No hay proveedores registrados.
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>

                {/* PROVEEDOR MODAL */}
                {showProvModal && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1100, padding: '1rem',
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
                  }} onClick={() => setShowProvModal(false)}>
                    <div className="glass-card" onClick={e => e.stopPropagation()} style={{
                      maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.95)', color: '#000',
                      maxHeight: '90vh', overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
                        <h3 className="section-title" style={{ margin: 0, color: 'var(--text-dark)' }}>
                          {editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </h3>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                          onClick={() => setShowProvModal(false)}
                        >
                          ✕
                        </button>
                      </div>
                      <form onSubmit={handleProvSubmit} className="form-grid">
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Nombre *</label>
                          <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.nombre} onChange={e => setProvForm({
                            ...provForm,
                            nombre: e.target.value
                          })} required />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>CUIT (Opcional)</label>
                          <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.cuit} onChange={e => setProvForm({
                            ...provForm,
                            cuit: e.target.value
                          })} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Teléfono (Opcional)</label>
                          <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.telefono} onChange={e => setProvForm({
                            ...provForm,
                            telefono: e.target.value
                          })} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Email (Opcional)</label>
                          <input type="email" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.email} onChange={e => setProvForm({
                            ...provForm,
                            email: e.target.value
                          })} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Dirección (Opcional)</label>
                          <textarea className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.direccion} onChange={e => setProvForm({
                            ...provForm,
                            direccion: e.target.value
                          })} rows="2"></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" className="btn btn-outline" style={{ flex: 1, borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }} onClick={() => setShowProvModal(false)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>;
};
export default AdminSuppliersView;