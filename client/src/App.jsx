import React, { useEffect } from 'react';
import OrderDetailModal from './components/modals/OrderDetailModal';
import TransitLossModal from './components/modals/TransitLossModal';
import MachineModal from './components/modals/MachineModal';
import EditStockModal from './components/modals/EditStockModal';
import MaintenanceModal from './components/modals/MaintenanceModal';
import AdminConsumptionAuditView from './views/admin/AdminConsumptionAuditView';
import AdminProjectionsView from './views/admin/AdminProjectionsView';
import AdminAuditView from './views/admin/AdminAuditView';
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
import BranchInventoryCheckView from './views/sucursal/BranchInventoryCheckView';
import BranchStockView from './views/sucursal/BranchStockView';
import BranchRetiroInternoView from './views/sucursal/BranchRetiroInternoView';
import AdminProductsView from './views/admin/AdminProductsView';
import AdminOrdersView from './views/admin/AdminOrdersView';
import AdminFlujoView from './views/admin/AdminFlujoView';
import AdminStockView from './views/admin/AdminStockView';
import AdminLogisticsHub from './views/admin/AdminLogisticsHub';
import { DataProvider, useData } from './context/DataContext';
import { useAutoUpdate } from './hooks/useAutoUpdate';
import { ROLE_ALLOWED_TABS, ROLE_DEFAULT_TAB } from './hooks/useAuth';

const ProtectedRoute = ({ user, allowedRoles, requireSucursalId, children }) => {
  if (!user || !user.auth_id) return null;
  if (allowedRoles && !allowedRoles.includes(user.rol)) return null;
  if (requireSucursalId && user.sucursal_id !== requireSucursalId) return null;
  return children;
};

const AppContent = () => {
  const { 
    user, authLoading, activeTab, setActiveTab, loading, toast, handleLogout, 
    usernameInput, setUsernameInput, passwordInput, setPasswordInput, handleLogin,
    sessionWarning, extendSession,
    showEditStockModal, showMaquinaModal, showMaintenanceModal, 
    selectedPedido, showLossModal, fetchData, showToast,
    handleClearTestData
  } = useData();

  useAutoUpdate(showToast);

  // Guardián de rutas/pestañas protegidas según el rol autenticado
  useEffect(() => {
    if (!user || !user.rol) return;
    const allowed = ROLE_ALLOWED_TABS[user.rol] || [];
    const isForbiddenBranchTab = user.rol === 'sucursal' && activeTab === 'retiro_interno' && user.sucursal_id !== 4;
    if (!activeTab || !allowed.includes(activeTab) || isForbiddenBranchTab) {
      const fallback = ROLE_DEFAULT_TAB[user.rol] || 'pedidos_lista';
      setActiveTab(fallback);
      localStorage.setItem('biscui_tab', fallback);
    } else {
      localStorage.setItem('biscui_tab', activeTab);
    }
  }, [user, activeTab, setActiveTab]);

  if (authLoading && !user) {
    return (
      <div className="login-wrapper">
        <div className="glass-card login-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-light)' }}>Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

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

  const getManualUrl = () => {
    switch (user?.rol) {
      case 'admin': return 'https://screeching-magician-d39.notion.site/Manual-Administrador-388a3624868a800a939dfe2d908ee36a';
      case 'heladero': return 'https://screeching-magician-d39.notion.site/Manual-heladero-379a3624868a81dc85efd39fae421c60';
      case 'pastelero': return 'https://screeching-magician-d39.notion.site/Manual-Pastelero-381a3624868a8119a848e5da43dba11f';

      case 'sucursal': return 'https://app.notion.com/p/Manual-Empleados-Sucursales-381a3624868a81508ae7d4de1cb3bba1';
      case 'casacentral': return 'https://screeching-magician-d39.notion.site/Stock-de-Sucursales-388a3624868a8110a09fcadd388dc001';
      default: return 'https://screeching-magician-d39.notion.site/Sistema-Biscui-Manuales-379a3624868a80658d2cd1d20d963cb5';
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <img src="/logo.webp" alt="Biscui Logo" className="header-logo" />
        </div>

        <div className="user-profile">
          <a 
            href={getManualUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-light)', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              marginRight: '0.2rem',
              padding: '0.2rem',
              textDecoration: 'none'
            }}
            title="Ver Manual"
          >
            📖
          </a>
          {/* <button 
            className="btn btn-sm" 
            style={{ 
              background: 'var(--danger)', 
              border: 'none', 
              color: 'white', 
              fontSize: '0.8rem', 
              cursor: 'pointer',
              marginRight: '0.5rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '4px'
            }} 
            onClick={async () => {
              if (window.confirm('¿Seguro que deseas limpiar todos los datos de prueba? Esto vaciará stocks, pedidos, etc.')) {
                if (handleClearTestData) {
                  await handleClearTestData();
                  if (fetchData) await fetchData();
                }
              }
            }}
            title="Limpiar Datos de Prueba"
          >
            Vaciar BD
          </button> */}
          <button 
            className="btn btn-sm" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-light)', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              marginRight: '0.5rem',
              padding: '0.2rem'
            }} 
            onClick={async () => {
              if (fetchData) {
                await fetchData();
                if (showToast) showToast('Datos actualizados', 'success');
              }
            }}
            title="Actualizar Datos"
          >
            ↻
          </button>
          <div className="user-info">
            <div className="name">{user.nombre}</div>
            <div className="role">{user.sucursal_id ? `${user.rol} | ${user.sucursal_nombre}` : user.rol}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="main-content">
        <ProtectedRoute user={user} allowedRoles={['admin']}>
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>Stock de Sucursales</button>
              <button className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`} onClick={() => setActiveTab('logistics')}>Logística y Pedidos</button>
              <button className={`tab-btn ${activeTab === 'produccion_req' ? 'active' : ''}`} onClick={() => setActiveTab('produccion_req')}>Proyecciones de Fábrica</button>
              <button className={`tab-btn ${activeTab === 'carga_produccion' ? 'active' : ''}`} onClick={() => setActiveTab('carga_produccion')}>Carga de Producción</button>
              <button className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveTab('catalogo')}>Productos</button>
              <button className={`tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`} onClick={() => setActiveTab('proveedores')}>Proveedores y Clientes</button>
              <button className={`tab-btn ${activeTab === 'maquinas' ? 'active' : ''}`} onClick={() => setActiveTab('maquinas')}>Mantenimiento y Máquinas</button>
              <button className={`tab-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>Auditoría de Movimientos</button>
            </div>

            {activeTab === 'matrix' && <AdminStockView />}
            {(activeTab === 'logistics' || activeTab === 'flujo') && <AdminLogisticsHub />}
            {activeTab === 'produccion_req' && <AdminProjectionsView />}
            {activeTab === 'carga_produccion' && <FactoryProductionView />}
            {activeTab === 'catalogo' && <AdminProductsView />}
            {activeTab === 'maquinas' && <AdminMaintenanceView />}
            {activeTab === 'proveedores' && <AdminSuppliersView />}
            {activeTab === 'auditoria' && <AdminAuditView />}
          </div>
        </ProtectedRoute>

        <ProtectedRoute user={user} allowedRoles={['heladero', 'pastelero']}>
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'produccion' ? 'active' : ''}`} onClick={() => setActiveTab('produccion')}>
                {user.rol === 'heladero' ? 'Cargar Producción' : 'Cargar Pastelería'}
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
        </ProtectedRoute>

        <ProtectedRoute user={user} allowedRoles={['transportista']}>
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
        </ProtectedRoute>

        <ProtectedRoute user={user} allowedRoles={['sucursal']}>
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'pedido_nuevo' ? 'active' : ''}`} onClick={() => setActiveTab('pedido_nuevo')}>Nuevo Pedido a Fábrica</button>
              <button className={`tab-btn ${activeTab === 'pedidos_lista' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos_lista')}>Mis Recepciones</button>
              <button className={`tab-btn ${activeTab === 'consumo' ? 'active' : ''}`} onClick={() => setActiveTab('consumo')}>Registrar Consumo Diario</button>
              <button className={`tab-btn ${activeTab === 'mi_stock' ? 'active' : ''}`} onClick={() => setActiveTab('mi_stock')}>Mi Stock Actual</button>
              <button className={`tab-btn ${activeTab === 'ajuste_inventario' ? 'active' : ''}`} onClick={() => setActiveTab('ajuste_inventario')}>Ajuste Semanal</button>
              {user.sucursal_id === 4 && (
                <button className={`tab-btn ${activeTab === 'retiro_interno' ? 'active' : ''}`} onClick={() => setActiveTab('retiro_interno')}>Retiro Interno (Fábrica)</button>
              )}
            </div>

            {activeTab === 'pedido_nuevo' && <BranchOrderView />}
            {activeTab === 'pedidos_lista' && <BranchOrderListView />}
            {activeTab === 'consumo' && <BranchConsumptionView />}
            {activeTab === 'mi_stock' && <BranchStockView />}
            {activeTab === 'ajuste_inventario' && <BranchInventoryCheckView />}
            {activeTab === 'retiro_interno' && (
              <ProtectedRoute user={user} allowedRoles={['sucursal']} requireSucursalId={4}>
                <BranchRetiroInternoView />
              </ProtectedRoute>
            )}
          </div>
        </ProtectedRoute>

        {selectedPedido && <OrderDetailModal />}
        {showLossModal && <TransitLossModal />}
        {showEditStockModal && <EditStockModal />}
        {showMaquinaModal && <MachineModal />}
        {showMaintenanceModal && <MaintenanceModal />}

      </main>

      {sessionWarning && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #f59e0b',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            maxWidth: '420px'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>⏳</span>
          <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.4 }}>
            {sessionWarning.warningType === 'inactivity' ? (
              <>
                <strong>Cierre por inactividad:</strong> tu sesión se cerrará en{' '}
                <strong>{sessionWarning.remainingSeconds}s</strong>.
              </>
            ) : (
              <>
                <strong>Fin de turno:</strong> tu sesión alcanzará el tiempo máximo en{' '}
                <strong>{sessionWarning.remainingSeconds}s</strong>.
              </>
            )}
          </div>
          {sessionWarning.warningType === 'inactivity' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={extendSession}
              style={{ whiteSpace: 'nowrap' }}
            >
              Seguir conectado
            </button>
          )}
        </div>
      )}

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
