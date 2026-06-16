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
              <th>Preparado</th>
              <th>Despachado</th>
              <th>Entregado</th>
            </tr>
          </thead>
          <tbody>
            {orders.filter(order => {
            if (!adminFlujoSearch) return true;
            const q = adminFlujoSearch.toLowerCase();
            return order.id.toString().includes(q) || order.destino_nombre && order.destino_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).map(order => <tr key={order.id} style={{
            cursor: 'pointer'
          }} onClick={() => viewOrderDetail(order.id)}>
                  <td>
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
                  <td><strong>{order.destino_nombre}</strong></td>
                  <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                  <td>{order.fecha_preparacion ? new Date(order.fecha_preparacion).toLocaleDateString() : 'Pendiente'}</td>
                  <td>{order.fecha_despacho ? new Date(order.fecha_despacho).toLocaleDateString() : 'Pendiente'}</td>
                  <td>{order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString() : 'Pendiente'}</td>
                </tr>)}
            {orders.filter(order => {
            if (!adminFlujoSearch) return true;
            const q = adminFlujoSearch.toLowerCase();
            return order.id.toString().includes(q) || order.destino_nombre && order.destino_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).length === 0 && <tr>
                <td colSpan="7" style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '2rem 1rem'
            }}>
                  No se encontraron pedidos.
                </td>
              </tr>}
          </tbody>
        </table>
      </div>
    </div>;
};
export default AdminFlujoView;