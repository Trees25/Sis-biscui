import { useData } from '../../context/DataContext';
import React from 'react';
import { formatQuantity, formatQuantityShort, formatTipo, getBadgeClass, translateState, formatDate } from '../../utils/formatters';
const AdminDiscrepanciesView = () => {
  const {
    adminDiscrepanciaSearch,
    setAdminDiscrepanciaSearch,
    dashboardStats,
    formatQuantity,
    productos
  } = useData();
  return <div className="glass-card">
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
      }}>Historial de Pérdidas y Diferencias</h3>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por producto, motivo o usuario..." value={adminDiscrepanciaSearch} onChange={e => setAdminDiscrepanciaSearch(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Cant. Perdida</th>
                        <th>Motivo / Aclaración</th>
                        <th>Reportó</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardStats?.discrepancies.filter(disc => {
            if (!adminDiscrepanciaSearch) return true;
            const q = adminDiscrepanciaSearch.toLowerCase();
            return disc.producto_nombre && disc.producto_nombre.toLowerCase().includes(q) || disc.motivo && disc.motivo.toLowerCase().includes(q) || disc.reportado_por_nombre && disc.reportado_por_nombre.toLowerCase().includes(q) || disc.tipo && disc.tipo.toLowerCase().includes(q) || disc.tipo === 'transito' && 'en tránsito'.includes(q) || disc.tipo === 'recepcion' && 'recepción'.includes(q) || disc.tipo === 'produccion' && 'merma fábrica'.includes(q);
          }).map(disc => <tr key={disc.id}>
                            <td>{new Date(disc.fecha_reporte).toLocaleDateString()}</td>
                            <td><strong>{disc.producto_nombre}</strong></td>
                            <td>
                              <span className={`badge ${disc.tipo === 'transito' ? 'badge-en_transito' : disc.tipo === 'recepcion' ? 'badge-con_discrepancia' : 'badge-solicitado'}`}>
                                {disc.tipo === 'transito' ? 'En Tránsito' : disc.tipo === 'recepcion' ? 'Recepción' : 'Merma Fábrica'}
                              </span>
                            </td>
                            <td style={{
              color: 'var(--danger)',
              fontWeight: 600
            }}>{formatQuantity(disc.cantidad_perdida, productos.find(p => p.id === disc.producto_id))}</td>
                            <td>{disc.motivo}</td>
                            <td>{disc.reportado_por_nombre}</td>
                          </tr>)}
                      {(!dashboardStats?.discrepancies || dashboardStats.discrepancies.filter(disc => {
            if (!adminDiscrepanciaSearch) return true;
            const q = adminDiscrepanciaSearch.toLowerCase();
            return disc.producto_nombre && disc.producto_nombre.toLowerCase().includes(q) || disc.motivo && disc.motivo.toLowerCase().includes(q) || disc.reportado_por_nombre && disc.reportado_por_nombre.toLowerCase().includes(q) || disc.tipo && disc.tipo.toLowerCase().includes(q);
          }).length === 0) && <tr>
                          <td colSpan="6" style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '2rem 1rem'
            }}>
                            No hay mermas o discrepancias registradas que coincidan con la búsqueda.
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>;
};
export default AdminDiscrepanciesView;