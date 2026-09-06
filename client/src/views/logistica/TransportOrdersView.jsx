import { formatDate } from '../../utils/formatters';
import { useData } from '../../context/DataContext';
import React from 'react';
const TransportOrdersView = () => {
  const {
    driverOrderSearch,
    setDriverOrderSearch,
    orders,
    getBadgeClass,
    translateState,
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
      }}>Pedidos por Preparar para Despacho</h3>
                  <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar por ID o Destino..." value={driverOrderSearch} onChange={e => setDriverOrderSearch(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Pedido</th>
                        <th>Sucursal Destino</th>
                        <th>Estado</th>
                        <th>Fecha de Solicitud</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => o.estado === 'solicitado').filter(order => {
            if (!driverOrderSearch) return true;
            const q = driverOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || order.sucursal_nombre && order.sucursal_nombre.toLowerCase().includes(q);
          }).map(order => <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.sucursal_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{formatDate()}</td>
                            <td>
                              <button className="btn btn-secondary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                Revisar y Preparar
                              </button>
                            </td>
                          </tr>)}
                      {orders.filter(o => o.estado === 'solicitado').filter(order => {
            if (!driverOrderSearch) return true;
            const q = driverOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || order.sucursal_nombre && order.sucursal_nombre.toLowerCase().includes(q);
          }).length === 0 && <tr>
                            <td colSpan="5" style={{
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
export default TransportOrdersView;