import { formatDate } from '../../utils/formatters';
import { useData } from '../../context/DataContext';
import React from 'react';
const TransportRoutesView = () => {
  const {
    driverRouteSearch,
    setDriverRouteSearch,
    orders,
    user,
    translateState,
    getBadgeClass,
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
      }}>Control de Envíos y Carga</h3>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por ID o Destino..." value={driverRouteSearch} onChange={e => setDriverRouteSearch(e.target.value)} />
                </div>
                <p style={{
      fontSize: '0.85rem',
      color: 'var(--text-light)',
      marginBottom: '1.2rem'
    }}>
                  Visualiza los pedidos armados en fábrica, confirma qué estás subiendo a tu camión, registra mermas de viaje y confirma entregas.
                </p>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Pedido</th>
                        <th>Destino</th>
                        <th>Estado actual</th>
                        <th>Preparado el</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(order => order.sucursal_destino_id !== user.sucursal_id).filter(order => {
            if (!driverRouteSearch) return true;
            const q = driverRouteSearch.toLowerCase();
            return order.id.toString().includes(q) || order.sucursal_nombre && order.sucursal_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).map(order => <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.sucursal_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{order.fecha_preparacion ? formatDate() : '-'}</td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                {order.estado === 'preparado' ? 'Iniciar Carga' : 'Ver y Gestionar'}
                              </button>
                            </td>
                          </tr>)}
                      {orders.filter(order => order.sucursal_destino_id !== user.sucursal_id).filter(order => {
            if (!driverRouteSearch) return true;
            const q = driverRouteSearch.toLowerCase();
            return order.id.toString().includes(q) || order.sucursal_nombre && order.sucursal_nombre.toLowerCase().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).length === 0 && <tr>
                            <td colSpan="5" style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '2rem 1rem'
            }}>
                              No se encontraron viajes activos.
                            </td>
                          </tr>}
                    </tbody>
                  </table>
                </div>
              </div>;
};
export default TransportRoutesView;