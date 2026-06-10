import { useData } from '../../context/DataContext';
import React from 'react';
const AdminConsumptionAuditView = () => {
  const {
    handleDownloadAuditoriaCSV,
    auditoriaFilterSucursal,
    setAuditoriaFilterSucursal,
    sucursales,
    auditoriaFilterDays,
    setAuditoriaFilterDays,
    auditoriaData,
    productos
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
      }}>Auditoría de Consumo Diario</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadAuditoriaCSV}>
                    📥 Descargar CSV
                  </button>
                </div>
                
                <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    }}>
                  <div className="form-group" style={{
        flex: '1 1 200px'
      }}>
                    <label>Sucursal</label>
                    <select className="form-control" value={auditoriaFilterSucursal} onChange={e => setAuditoriaFilterSucursal(e.target.value)}>
                      <option value="">Todas las Sucursales</option>
                      {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{
        flex: '1 1 200px'
      }}>
                    <label>Rango de Fechas</label>
                    <select className="form-control" value={auditoriaFilterDays} onChange={e => setAuditoriaFilterDays(e.target.value)}>
                      <option value="1">Últimas 24 horas</option>
                      <option value="7">Últimos 7 días</option>
                      <option value="30">Últimos 30 días</option>
                      <option value="">Todo el Historial</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha y Hora</th>
                        <th>Sucursal</th>
                        <th>Producto / Sabor</th>
                        <th>Registrado Por</th>
                        <th style={{
              textAlign: 'right'
            }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoriaData.map(row => {
            const isWeight = row.unidad_medida === 'peso';
            const qty = isWeight ? parseFloat(row.cantidad).toFixed(3) : row.cantidad;
            const unit = isWeight ? "kg" : "unidades";
            return <tr key={row.id}>
                            <td>{new Date(row.fecha).toLocaleString()}</td>
                            <td>{row.sucursal_nombre || '-'}</td>
                            <td><strong>{row.producto_nombre || '-'}</strong></td>
                            <td>{row.usuario_nombre || '-'}</td>
                            <td style={{
                textAlign: 'right'
              }}>
                              <span style={{
                  fontWeight: 600,
                  color: 'var(--primary)'
                }}>
                                {qty} {unit}
                              </span>
                            </td>
                          </tr>;
          })}
                      {auditoriaData.length === 0 && <tr>
                          <td colSpan="5" style={{
              textAlign: 'center',
              padding: '2rem'
            }}>No hay registros de consumo en este periodo.</td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>;
};
export default AdminConsumptionAuditView;