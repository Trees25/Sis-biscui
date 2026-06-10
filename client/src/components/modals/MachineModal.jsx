import { useData } from '../../context/DataContext';
import React from 'react';
const MachineModal = () => {
  const {
    editingMaquina,
    setShowMaquinaModal,
    setEditingMaquina,
    handleSaveMaquina,
    maquinaForm,
    setMaquinaForm,
    sucursales,
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
                  {editingMaquina ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}
                </h3>
                <button className="btn btn-outline btn-sm" style={{
          borderColor: 'rgba(0,0,0,0.2)',
          color: 'var(--text-dark)'
        }} onClick={() => {
          setShowMaquinaModal(false);
          setEditingMaquina(null);
        }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMaquina}>
                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Nombre del Equipo *</label>
                  <input type="text" className="form-control" value={maquinaForm.nombre} onChange={e => setMaquinaForm({
            ...maquinaForm,
            nombre: e.target.value
          })} required placeholder="Ej. Cámara de frío, Licuadora 1" style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }} />
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Tipo de Equipo *</label>
                  <select className="form-control" value={maquinaForm.tipo_equipo} onChange={e => setMaquinaForm({
            ...maquinaForm,
            tipo_equipo: e.target.value
          })} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }}>
                    <option value="licuadora_horno_batidora_micro">Licuadora / Horno / Batidora / Microondas</option>
                    <option value="maquina_helado">Máquina de Helado</option>
                    <option value="frio_abatidor_heladera_camara">Abatidor / Heladera / Cámara (Frío)</option>
                    <option value="aire_acondicionado">Aire Acondicionado</option>
                    <option value="otro">Otro Equipo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Sucursal / Ubicación *</label>
                  <select className="form-control" value={maquinaForm.sucursal_id} onChange={e => setMaquinaForm({
            ...maquinaForm,
            sucursal_id: e.target.value
          })} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }}>
                    <option value="">-- Seleccionar --</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
            }}>Marca</label>
                    <input type="text" className="form-control" value={maquinaForm.marca} onChange={e => setMaquinaForm({
              ...maquinaForm,
              marca: e.target.value
            })} placeholder="Ej. Bohn, Vitamix" style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Modelo</label>
                    <input type="text" className="form-control" value={maquinaForm.modelo} onChange={e => setMaquinaForm({
              ...maquinaForm,
              modelo: e.target.value
            })} placeholder="Ej. Quiet One" style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
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
            }}>Número de Serie</label>
                    <input type="text" className="form-control" value={maquinaForm.numero_serie} onChange={e => setMaquinaForm({
              ...maquinaForm,
              numero_serie: e.target.value
            })} placeholder="Ej. SN-88123" style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                  <div className="form-group">
                    <label style={{
              color: 'var(--text-dark)',
              fontWeight: 600
            }}>Fecha Adquisición</label>
                    <input type="date" className="form-control" value={maquinaForm.fecha_adquisicion} onChange={e => setMaquinaForm({
              ...maquinaForm,
              fecha_adquisicion: e.target.value
            })} style={{
              border: '1px solid rgba(0,0,0,0.15)'
            }} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Estado *</label>
                  <select className="form-control" value={maquinaForm.estado} onChange={e => setMaquinaForm({
            ...maquinaForm,
            estado: e.target.value
          })} required style={{
            border: '1px solid rgba(0,0,0,0.15)'
          }}>
                    <option value="activo">Activo / Operativo</option>
                    <option value="inactivo">Inactivo / Parado</option>
                    <option value="en_mantenimiento">En Mantenimiento</option>
                    <option value="de_baja">De Baja / Descartado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600
          }}>Descripción / Observaciones</label>
                  <textarea className="form-control" rows="3" value={maquinaForm.descripcion} onChange={e => setMaquinaForm({
            ...maquinaForm,
            descripcion: e.target.value
          })} placeholder="Detalles adicionales sobre el equipo..." style={{
            border: '1px solid rgba(0,0,0,0.15)',
            resize: 'vertical'
          }}></textarea>
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
            setShowMaquinaModal(false);
            setEditingMaquina(null);
          }} disabled={loading} style={{
            borderColor: 'rgba(0,0,0,0.2)',
            color: 'var(--text-dark)'
          }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingMaquina ? 'Actualizar Equipo' : 'Guardar Equipo'}
                  </button>
                </div>
              </form>
            </div>
          </div>;
};
export default MachineModal;