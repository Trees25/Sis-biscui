import { useData } from '../../context/DataContext';
import React from 'react';
import { formatDate } from '../../utils/formatters';
const BranchOrderListView = () => {
  const {
    sucursalOrderSearch,
    setSucursalOrderSearch,
    orders,
    translateState,
    getBadgeClass,
    viewOrderDetail,
    user,
    sucursales
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
            if (order.sucursal_destino_id !== user.sucursal_id) return false;
            if (!sucursalOrderSearch) return true;
            const q = sucursalOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || (order.branch_local_id && order.branch_local_id.toString().includes(q)) || order.estado && translateState(order.estado).toLowerCase().includes(q);
          }).map(order => <tr key={order.id}>
                            <td>
                              #{order.branch_local_id || order.id} <span style={{fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '4px'}}>(Global: #{order.id})</span>
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
                            <td>{formatDate(order.created_at)}</td>
                            <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                {order.estado === 'en_transito' || user.sucursal_id === 4 && order.estado === 'preparado' ? 'Controlar y Recibir' : 'Ver Detalle'}
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => {
                                const branchName = user.sucursal_id === 1 ? 'Fábrica' : (sucursales?.find(s => s.id === user.sucursal_id)?.nombre || 'mi sucursal');
                                const whatsappMessage = encodeURIComponent(`¡Hola! Soy de ${branchName}, quiero avisar sobre el pedido (ID Local #${order.branch_local_id} / Global #${order.id}).`);
                                window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
                              }} title="Avisar por WhatsApp" style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: '#25D366', color: '#25D366' }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M12.031 0C5.394 0 0 5.393 0 12.031c0 2.12.551 4.195 1.6 6.015L.308 24l6.104-1.6c1.782.97 3.805 1.48 5.86 1.48h.005c6.634 0 12.032-5.395 12.032-12.033C24.31 5.23 18.89 0 12.031 0zm0 21.848h-.003c-1.802 0-3.567-.482-5.112-1.393l-.367-.217-3.8.995.998-3.7-.238-.38c-.997-1.59-1.523-3.414-1.523-5.285 0-5.5 4.475-9.972 9.977-9.972 5.5 0 9.975 4.474 9.975 9.974s-4.475 9.978-9.907 9.978zm5.474-7.464c-.3-.15-1.776-.877-2.052-.977-.275-.1-.476-.15-.676.15-.2.3-.775.976-.95 1.176-.176.2-.351.226-.652.076-2.022-1.01-3.238-1.92-4.525-4.15-.15-.25-.015-.386.135-.536.136-.135.301-.35.452-.525.15-.175.201-.3.301-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.626-.926-2.226-.244-.587-.492-.507-.676-.516-.176-.01-.376-.01-.577-.01-.2 0-.526.075-.802.375s-1.053 1.026-1.053 2.502 1.077 2.898 1.227 3.098c.15.2 2.1 3.218 5.1 4.505 2.1.9 2.766.726 3.292.651.526-.075 1.776-.726 2.026-1.426.25-.7.25-1.301.176-1.426-.076-.125-.276-.2-.577-.35z"/>
                                </svg>
                              </button>
                            </td>
                          </tr>)}
                      {orders.filter(order => {
            if (order.sucursal_destino_id !== user.sucursal_id) return false;
            if (!sucursalOrderSearch) return true;
            const q = sucursalOrderSearch.toLowerCase();
            return order.id.toString().includes(q) || (order.branch_local_id && order.branch_local_id.toString().includes(q)) || order.estado && translateState(order.estado).toLowerCase().includes(q);
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