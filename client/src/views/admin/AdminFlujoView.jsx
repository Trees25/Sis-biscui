import { useData } from '../../context/DataContext';
import React from 'react';
import { getBadgeClass, translateState } from '../../utils/formatters';
const AdminFlujoView = () => {
  const {
    orders,
    adminFlujoSearch,
    setAdminFlujoSearch,
    viewOrderDetail
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
      }}>Flujo y Auditoría de Pedidos</h3>
        <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por ID, Destino o Estado..." value={adminFlujoSearch} onChange={e => setAdminFlujoSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Solicitado</th>
              <th>Fecha Merma</th>
              <th>Producto (Categoría)</th>
              <th>Cant. Perdida</th>
              <th>Motivo / Aclaración</th>
              <th>Reportó</th>
            </tr>
          </thead>
          <tbody>
            {orders.filter(order => {
              if (!adminFlujoSearch) return true;
              const q = adminFlujoSearch.toLowerCase();
              return order.id.toString().includes(q) || order.destino_nombre && order.destino_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
            }).map(order => {
              const discs = order.discrepancias_mapped || [];
              const rowSpan = Math.max(1, discs.length);
              
              return (
                <React.Fragment key={order.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => viewOrderDetail(order.id)}>
                    <td rowSpan={rowSpan}>
                      #{order.id}
                      {order.es_evento && <span className="badge" style={{
                        background: 'var(--primary)',
                        color: 'white',
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.35rem',
                        marginLeft: '0.3rem'
                      }}>
                        Evento
                      </span>}
                    </td>
                    <td rowSpan={rowSpan}><strong>{order.destino_nombre}</strong></td>
                    <td rowSpan={rowSpan}><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                    <td rowSpan={rowSpan}>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                    
                    {discs.length > 0 ? (
                      <>
                        <td style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{new Date(discs[0].fecha).toLocaleDateString()}</td>
                        <td>
                          <strong>{discs[0].producto_nombre}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                            {discs[0].producto_categoria}
                          </span>
                        </td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{discs[0].cantidad_perdida}</td>
                        <td style={{ fontSize: '0.85rem' }}>{discs[0].motivo}</td>
                        <td style={{ fontSize: '0.85rem' }}>{discs[0].reportado_por_nombre}</td>
                      </>
                    ) : (
                      <>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                          Sin pérdidas ni diferencias
                        </td>
                      </>
                    )}
                  </tr>
                  {discs.length > 1 && discs.slice(1).map((disc) => (
                    <tr key={disc.id} style={{ cursor: 'pointer', background: 'rgba(255, 71, 87, 0.02)' }} onClick={() => viewOrderDetail(order.id)}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{new Date(disc.fecha).toLocaleDateString()}</td>
                      <td>
                        <strong>{disc.producto_nombre}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                          {disc.producto_categoria}
                        </span>
                      </td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{disc.cantidad_perdida}</td>
                      <td style={{ fontSize: '0.85rem' }}>{disc.motivo}</td>
                      <td style={{ fontSize: '0.85rem' }}>{disc.reportado_por_nombre}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {orders.filter(order => {
              if (!adminFlujoSearch) return true;
              const q = adminFlujoSearch.toLowerCase();
              return order.id.toString().includes(q) || order.destino_nombre && order.destino_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
            }).length === 0 && <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                  No se encontraron pedidos.
                </td>
              </tr>}
          </tbody>
        </table>
      </div>
    </div>;
};
export default AdminFlujoView;