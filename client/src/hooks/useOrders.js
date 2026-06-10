import { useState } from 'react';

export const useOrders = () => {
  const [flujoPedidosStats, setFlujoPedidosStats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [retiroItems, setRetiroItems] = useState({});
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [orderSubTab, setOrderSubTab] = useState('helados');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderItems, setOrderItems] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [orderIsEvent, setOrderIsEvent] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [loadItems, setLoadItems] = useState({});
  const [transpCargaForm, setTranspCargaForm] = useState({ transporte: '', driver: '' });
  const [transitLoss, setTransitLoss] = useState({ producto_id: '', cantidad_perdida: '', motivo: '' });
  const [showLossModal, setShowLossModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState({});
  const [receiveReasons, setReceiveReasons] = useState({});
  const [prodReqSearch, setProdReqSearch] = useState('');
  const [sucursalOrderSearch, setSucursalOrderSearch] = useState('');
  const [driverOrderSearch, setDriverOrderSearch] = useState('');
  const [driverRouteSearch, setDriverRouteSearch] = useState('');
  const [driverDepotSearch, setDriverDepotSearch] = useState('');
  const [adminOrderItems, setAdminOrderItems] = useState({});
  const [adminOrderDestination, setAdminOrderDestination] = useState('');
  const [adminOrderIsEvent, setAdminOrderIsEvent] = useState(false);
  const [adminOrderSolicitFabrication, setAdminOrderSolicitFabrication] = useState(false);
  const [prepareStockSource, setPrepareStockSource] = useState('evento');
  const [adminOrderSubTab, setAdminOrderSubTab] = useState('helados');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminOrderSupplierFilter, setAdminOrderSupplierFilter] = useState('');

  return {
    flujoPedidosStats, setFlujoPedidosStats,
    orders, setOrders,
    retiroItems, setRetiroItems,
    selectedPedido, setSelectedPedido,
    orderSubTab, setOrderSubTab,
    orderSearchQuery, setOrderSearchQuery,
    orderItems, setOrderItems,
    suggestions, setSuggestions,
    orderIsEvent, setOrderIsEvent,
    pendingItems, setPendingItems,
    loadItems, setLoadItems,
    transpCargaForm, setTranspCargaForm,
    transitLoss, setTransitLoss,
    showLossModal, setShowLossModal,
    receiveItems, setReceiveItems,
    receiveReasons, setReceiveReasons,
    prodReqSearch, setProdReqSearch,
    sucursalOrderSearch, setSucursalOrderSearch,
    driverOrderSearch, setDriverOrderSearch,
    driverRouteSearch, setDriverRouteSearch,
    driverDepotSearch, setDriverDepotSearch,
    adminOrderItems, setAdminOrderItems,
    adminOrderDestination, setAdminOrderDestination,
    adminOrderIsEvent, setAdminOrderIsEvent,
    adminOrderSolicitFabrication, setAdminOrderSolicitFabrication,
    prepareStockSource, setPrepareStockSource,
    adminOrderSubTab, setAdminOrderSubTab,
    adminOrderSearch, setAdminOrderSearch,
    adminOrderSupplierFilter, setAdminOrderSupplierFilter
  };
};
