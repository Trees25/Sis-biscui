import { useData } from '../../context/DataContext';
import React from 'react';
const BranchOrderListView = () => {
  const {
    sucursalOrderSearch,
    setSucursalOrderSearch,
    orders,
    translateState,
    getBadgeClass,
    viewOrderDetail,
    user
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
      }}>Pedidos y Envíos Entrantes</h3>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por ID o Estado..." value={sucursalOrderSearch} onChange={e => setSucursalOrderSearch(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Pedido</th>
                        <th>Estado</th>
                        <th>Solicitado el</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(order => {
            if (!sucursalOrderSearch) return true;
            const q = sucursalOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).map(order => <tr key={order.id}>
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
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{new Date(order.fecha_solicitud).toLocaleString()}</td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                {order.estado === 'en_transito' || user.sucursal_id === 4 && order.estado === 'preparado' ? 'Controlar y Recibir' : 'Ver Detalle'}
                              </button>
                            </td>
                          </tr>)}
                      {orders.filter(order => {
            if (!sucursalOrderSearch) return true;
            const q = sucursalOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).length === 0 && <tr>
                          <td colSpan="4" style={{
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
export default BranchOrderListView;