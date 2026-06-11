import React from 'react';
import OrderDetailModal from './components/modals/OrderDetailModal';
import TransitLossModal from './components/modals/TransitLossModal';
import MachineModal from './components/modals/MachineModal';
import EditStockModal from './components/modals/EditStockModal';
import MaintenanceModal from './components/modals/MaintenanceModal';
import AdminConsumptionAuditView from './views/admin/AdminConsumptionAuditView';
import AdminDiscrepanciesView from './views/admin/AdminDiscrepanciesView';
import AdminProjectionsView from './views/admin/AdminProjectionsView';
import AdminHistoricalView from './views/admin/AdminHistoricalView';
import AdminMaintenanceView from './views/admin/AdminMaintenanceView';
import AdminSuppliersView from './views/admin/AdminSuppliersView';
import FactoryProductionView from './views/fabrica/FactoryProductionView';
import FactoryStockView from './views/fabrica/FactoryStockView';
import FactoryEventOrdersView from './views/fabrica/FactoryEventOrdersView';
import TransportLoadView from './views/logistica/TransportLoadView';
import TransportStockView from './views/logistica/TransportStockView';
import TransportOrdersView from './views/logistica/TransportOrdersView';
import TransportRoutesView from './views/logistica/TransportRoutesView';
import BranchOrderView from './views/sucursal/BranchOrderView';
import BranchOrderListView from './views/sucursal/BranchOrderListView';
import BranchConsumptionView from './views/sucursal/BranchConsumptionView';
import BranchStockView from './views/sucursal/BranchStockView';
import BranchRetiroInternoView from './views/sucursal/BranchRetiroInternoView';
import AdminProductsView from './views/admin/AdminProductsView';
import AdminOrdersView from './views/admin/AdminOrdersView';
import AdminFlujoView from './views/admin/AdminFlujoView';
import AdminStockView from './views/admin/AdminStockView';
import AdminLogisticsHub from './views/admin/AdminLogisticsHub';
import { DataProvider, useData } from './context/DataContext';

const AppContent = () => {
  const { 
    user, activeTab, setActiveTab, loading, toast, handleLogout, 
    usernameInput, setUsernameInput, passwordInput, setPasswordInput, handleLogin,
    showEditStockModal, showMaquinaModal, showMaintenanceModal, 
    selectedPedido, showLossModal
  } = useData();

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="glass-card login-card">
          <div className="login-logo">
            <img src="/logo.webp" alt="Biscui Logo" style={{ width: '280px', height: 'auto', marginTop: '-35px', marginBottom: '-85px', objectFit: 'contain' }} />
            <p style={{ marginTop: '1px' }}>Trazabilidad y Control de Stock</p>
          </div>

          {toast && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.2rem',
              fontWeight: 500,
              background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${toast.type === 'error' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'}`,
              color: toast.type === 'error' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{toast.message}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Usuario o Email</label>
              <input
                id="username"
                type="text"
                className="form-control"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                required
                placeholder="admin@biscui.com o admin"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
                placeholder="••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <img src="/logo.webp" alt="Biscui Logo" className="header-logo" />
        </div>

        <div className="user-profile">
          <div className="user-info">
            <div className="name">{user.nombre}</div>
            <div className="role">{user.sucursal_id ? `${user.rol} | ${user.sucursal_nombre}` : user.rol}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="main-content">
        {user.rol === 'admin' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>Stock de Sucursales</button>
              <button className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`} onClick={() => setActiveTab('logistics')}>Logística y Pedidos</button>
              <button className={`tab-btn ${activeTab === 'discrepancias' ? 'active' : ''}`} onClick={() => setActiveTab('discrepancias')}>Historial de Pérdidas</button>
              <button className={`tab-btn ${activeTab === 'produccion_req' ? 'active' : ''}`} onClick={() => setActiveTab('produccion_req')}>Proyecciones de Fábrica</button>
              <button className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveTab('catalogo')}>Productos</button>
              <button className={`tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`} onClick={() => setActiveTab('proveedores')}>Proveedores</button>
              <button className={`tab-btn ${activeTab === 'maquinas' ? 'active' : ''}`} onClick={() => setActiveTab('maquinas')}>Mantenimiento y Máquinas</button>
            </div>

            {activeTab === 'matrix' && <AdminStockView />}
            {activeTab === 'logistics' && <AdminLogisticsHub />}
            {activeTab === 'discrepancias' && <AdminDiscrepanciesView />}
            {activeTab === 'produccion_req' && <AdminProjectionsView />}
            {activeTab === 'catalogo' && <AdminProductsView />}
            {activeTab === 'maquinas' && <AdminMaintenanceView />}
            {activeTab === 'proveedores' && <AdminSuppliersView />}
          </div>
        )}

        {(user.rol === 'heladero' || user.rol === 'pastelero' || user.rol === 'pastelero_helado') && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'produccion' ? 'active' : ''}`} onClick={() => setActiveTab('produccion')}>
                {user.rol === 'heladero' ? 'Cargar Producción' : user.rol === 'pastelero_helado' ? 'Cargar Pastelería Helada' : 'Cargar Pastelería'}
              </button>
              <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Mi Stock Fábrica</button>
              {user.rol === 'heladero' && (
                <button className={`tab-btn ${activeTab === 'pedidos_eventos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos_eventos')}>Pedidos de Eventos</button>
              )}
            </div>

            {activeTab === 'produccion' && <FactoryProductionView />}
            {activeTab === 'stock' && <FactoryStockView />}
            {activeTab === 'pedidos_eventos' && user.rol === 'heladero' && <FactoryEventOrdersView />}
          </div>
        )}

        {user.rol === 'transportista' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>Preparar Pedidos</button>
              <button className={`tab-btn ${activeTab === 'rutas' ? 'active' : ''}`} onClick={() => setActiveTab('rutas')}>Mis Viajes y Repartos</button>
              <button className={`tab-btn ${activeTab === 'carga_insumos' ? 'active' : ''}`} onClick={() => setActiveTab('carga_insumos')}>Carga de Productos/Insumos</button>
              <button className={`tab-btn ${activeTab === 'stock_fabrica' ? 'active' : ''}`} onClick={() => setActiveTab('stock_fabrica')}>Stock Fábrica</button>
            </div>

            {activeTab === 'carga_insumos' && <TransportLoadView />}
            {activeTab === 'stock_fabrica' && <TransportStockView />}
            {activeTab === 'pedidos' && <TransportOrdersView />}
            {activeTab === 'rutas' && <TransportRoutesView />}
          </div>
        )}

        {user.rol === 'sucursal' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'pedido_nuevo' ? 'active' : ''}`} onClick={() => setActiveTab('pedido_nuevo')}>Nuevo Pedido a Fábrica</button>
              <button className={`tab-btn ${activeTab === 'pedidos_lista' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos_lista')}>Mis Recepciones</button>
              <button className={`tab-btn ${activeTab === 'consumo' ? 'active' : ''}`} onClick={() => setActiveTab('consumo')}>Registrar Consumo Diario</button>
              <button className={`tab-btn ${activeTab === 'mi_stock' ? 'active' : ''}`} onClick={() => setActiveTab('mi_stock')}>Mi Stock Actual</button>
              {user.sucursal_id === 4 && (
                <button className={`tab-btn ${activeTab === 'retiro_interno' ? 'active' : ''}`} onClick={() => setActiveTab('retiro_interno')}>Retiro Interno (Fábrica)</button>
              )}
            </div>

            {activeTab === 'pedido_nuevo' && <BranchOrderView />}
            {activeTab === 'pedidos_lista' && <BranchOrderListView />}
            {activeTab === 'consumo' && <BranchConsumptionView />}
            {activeTab === 'mi_stock' && <BranchStockView />}
            {activeTab === 'retiro_interno' && user.sucursal_id === 4 && <BranchRetiroInternoView />}
          </div>
        )}

        {selectedPedido && <OrderDetailModal />}
        {showLossModal && <TransitLossModal />}
        {showEditStockModal && <EditStockModal />}
        {showMaquinaModal && <MachineModal />}
        {showMaintenanceModal && <MaintenanceModal />}

      </main>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
