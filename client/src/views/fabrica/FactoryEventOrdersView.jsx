import React from 'react';
import { useData } from '../../context/DataContext';
import { getBadgeClass, translateState } from '../../utils/formatters';

const FactoryEventOrdersView = () => {
  const { orders, heladeroEventSearch, setHeladeroEventSearch, viewOrderDetail } = useData();

  return (
    <div className="glass-card">
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
        }}>Pedidos de Eventos por Preparar</h3>
        <input 
          type="text" 
          className="form-control search-control-responsive" 
          placeholder="🔍 Buscar por ID o Destino..." 
          value={heladeroEventSearch} 
          onChange={e => setHeladeroEventSearch(e.target.value)} 
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Fecha de Solicitud</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .filter(o => o.es_evento && o.estado === 'solicitado')
              .filter(order => {
                if (!heladeroEventSearch) return true;
                const q = heladeroEventSearch.toLowerCase();
                return order.id.toString().includes(q) || (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q));
              })
              .map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td><strong>{order.destino_nombre}</strong></td>
                  <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                      Revisar y Preparar
                    </button>
                  </td>
                </tr>
              ))}
            {orders
              .filter(o => o.es_evento && o.estado === 'solicitado')
              .filter(order => {
                if (!heladeroEventSearch) return true;
                const q = heladeroEventSearch.toLowerCase();
                return order.id.toString().includes(q) || (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q));
              }).length === 0 && (
                <tr>
                  <td colSpan="5" style={{
                    textAlign: 'center',
                    color: 'var(--text-light)',
                    padding: '2rem 1rem'
                  }}>
                    No se encontraron pedidos de eventos.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FactoryEventOrdersView;
