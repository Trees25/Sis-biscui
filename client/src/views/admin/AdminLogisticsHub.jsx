import React, { useState } from 'react';
import AdminFlujoView from './AdminFlujoView';
import AdminOrdersView from './AdminOrdersView';
import AdminConsumptionAuditView from './AdminConsumptionAuditView';
import AdminDiscrepanciesView from './AdminDiscrepanciesView';
import AdminProductionOrdersView from './AdminProductionOrdersView';

const AdminLogisticsHub = () => {
  const [subTab, setSubTab] = useState('flujo');

  return (
    <div className="glass-card">
      <h3 className="section-title">Logística y Pedidos</h3>
      
      <div className="tabs" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button 
          className={`tab-btn ${subTab === 'flujo' ? 'active' : ''}`} 
          onClick={() => setSubTab('flujo')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Flujo de Pedidos
        </button>
        <button 
          className={`tab-btn ${subTab === 'armar_pedido' ? 'active' : ''}`} 
          onClick={() => setSubTab('armar_pedido')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Armar Pedido
        </button>
        <button 
          className={`tab-btn ${subTab === 'auditoria_consumo' ? 'active' : ''}`} 
          onClick={() => setSubTab('auditoria_consumo')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Auditoría de Consumo
        </button>
        <button 
          className={`tab-btn ${subTab === 'ordenes_fabrica' ? 'active' : ''}`} 
          onClick={() => setSubTab('ordenes_fabrica')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Órdenes a Fábrica
        </button>
      </div>

      <div className="sub-content">
        {subTab === 'flujo' && <AdminFlujoView />}
        {subTab === 'armar_pedido' && <AdminOrdersView />}
        {subTab === 'auditoria_consumo' && <AdminConsumptionAuditView />}
        {subTab === 'ordenes_fabrica' && <AdminProductionOrdersView />}
      </div>
    </div>
  );
};

export default AdminLogisticsHub;
