import { useData } from '../../context/DataContext';
import React from 'react';
const MaintenanceModal = () => {
  const {
    editingMaintenance,
    setShowMaintenanceModal,
    setEditingMaintenance,
    handleSaveMaintenance,
    maintenanceForm,
    getMaintenanceOptionsForMachine,
    setMaintenanceForm,
    maquinas,
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
      maxWidth: '500px',
      width: '100%',
      background: 'rgba(255, 255, 255, 0.98)',
      color: '#000',
      maxHeight: '90vh',
      overflowY: 'auto'
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
        }}>
                  {editingMaintenance ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}
                </h3>
                <button className="btn btn-outline btn-sm" style={{
          borderColor: 'rgba(0,0,0,0.2)',
          color: 'var(--text-dark)'
        }} onClick={() => {
          setShowMaintenanceModal(false);
          setEditingMaintenance(null);
        }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMaintenance}>
                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Seleccionar Equipo *</label>
                  <select className="form-control" value={maintenanceForm.maquina_id} onChange={e => {
            const maqId = e.target.value;
            const options = getMaintenanceOptionsForMachine(maqId);
            setMaintenanceForm(prev => ({
              ...prev,
              maquina_id: maqId,
              tipo: options.length > 0 ? options[0].value : 'otro'
            }));
          }} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }} disabled={editingMaintenance}>
                    <option value="">-- Seleccionar --</option>
                    {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.sucursal_nombre})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Tipo de Trabajo *</label>
                  <select className="form-control" value={maintenanceForm.tipo} onChange={e => setMaintenanceForm({
            ...maintenanceForm,
            tipo: e.target.value
          })} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }}>
                    {maintenanceForm.maquina_id ? getMaintenanceOptionsForMachine(maintenanceForm.maquina_id).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : <option value="otro">Selecciona primero un equipo</option>}
                  </select>
                </div>

                <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Fecha de Trabajo *</label>
                    <input type="date" className="form-control" value={maintenanceForm.fecha} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              fecha: e.target.value
            })} required style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Próximo Control (Opcional)</label>
                    <input type="date" className="form-control" value={maintenanceForm.proxima_fecha} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              proxima_fecha: e.target.value
            })} style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Descripción / Diagnóstico del Trabajo *</label>
                  <textarea className="form-control" rows="3" value={maintenanceForm.descripcion} onChange={e => setMaintenanceForm({
            ...maintenanceForm,
            descripcion: e.target.value
          })} placeholder="Detalles sobre lo realizado (ej: Limpieza profunda de los serpentines, cambio de aceite...)" required style={{
            border: '1px solid rgba(0,0,0,0.15)',
            resize: 'vertical'
          }}></textarea>
                </div>

                {/* Cambio de Repuesto Checkbox */}
                <div style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px dashed rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '0.8rem',
          marginBottom: '1.2rem'
        }}>
                  <div className="form-group" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: 0
          }}>
                    <input type="checkbox" id="maintCambioRepuesto" checked={maintenanceForm.cambio_repuesto} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              cambio_repuesto: e.target.checked
            })} style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }} />
                    <label htmlFor="maintCambioRepuesto" style={{
              margin: 0,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-dark)'
            }}>
                      🔧 ¿Hubo cambio de repuesto?
                    </label>
                  </div>

                  {maintenanceForm.cambio_repuesto && <div className="form-group" style={{
            marginTop: '0.8rem',
            marginBottom: 0
          }}>
                      <label style={{
              color: 'var(--text-dark)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>Detalle de Repuestos Cambiados *</label>
                      <input type="text" className="form-control" placeholder="Ej: Cambio de correa dentada, recambio de capacitor" value={maintenanceForm.repuesto_detalle} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              repuesto_detalle: e.target.value
            })} required={maintenanceForm.cambio_repuesto} style={{
              border: '1px solid rgba(0,0,0,0.15)',
              padding: '0.5rem 0.75rem',
              fontSize: '0.85rem'
            }} />
                    </div>}
                </div>

                <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Costo ($ ARS)</label>
                    <input type="number" className="form-control" placeholder="0.00" min="0" step="0.01" value={maintenanceForm.costo} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              costo: e.target.value
            })} style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Técnico / Empresa</label>
                    <input type="text" className="form-control" placeholder="Ej: Refrigeración González" value={maintenanceForm.realizado_por} onChange={e => setMaintenanceForm({
              ...maintenanceForm,
              realizado_por: e.target.value
            })} style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                </div>

                <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          marginTop: '1.5rem',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          paddingTop: '1rem'
        }}>
                  <button type="button" className="btn btn-outline" onClick={() => {
            setShowMaintenanceModal(false);
            setEditingMaintenance(null);
          }} disabled={loading} style={{
            borderColor: 'rgba(0,0,0,0.2)',
            color: 'var(--text-dark)'
          }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingMaintenance ? 'Actualizar Trabajo' : 'Registrar Trabajo'}
                  </button>
                </div>
              </form>
            </div>
          </div>;
};
export default MaintenanceModal;