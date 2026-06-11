import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useCatalog } from '../hooks/useCatalog';
import { useStock } from '../hooks/useStock';
import { useOrders } from '../hooks/useOrders';
import { useMaintenance } from '../hooks/useMaintenance';
export const DataContext = createContext();
export const useData = () => {
  return useContext(DataContext);
};
const categories = [{
  id: 'helados',
  name: 'Helados'
}, {
  id: 'pasteleria_helada',
  name: 'Pastelería Helada'
}, {
  id: 'pasteleria',
  name: 'Pastelería Clásica'
}, {
  id: 'viennoiserie',
  name: 'Viennoiserie'
}, {
  id: 'termicos',
  name: 'Térmicos'
}, {
  id: 'otros',
  name: 'Otros'
}];
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatQuantity = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso') {
    const kg = parseFloat(cantidad);
    return `${kg.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    })} kg`;
  }
  return `${cantidad} u`;
};
const formatQuantityShort = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (cantidad === 0) return '0';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso') {
    const kg = parseFloat(cantidad);
    return `${kg.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    })} kg`;
  }
  return `${cantidad} u`;
};
const UnitCalculatorInput = ({
  value,
  onChange,
  product,
  placeholder = "Cantidad",
  disabled = false,
  min = 0
}) => {
  const isWeight = product?.unidad_medida === 'peso';
  if (isWeight) {
    const displayVal = value !== undefined && value !== null && value !== '' ? parseFloat(value) : '';
    return <div style={{
      display: 'flex',
      gap: '0.4rem',
      alignItems: 'center',
      width: '100%'
    }}>
        <input type="number" step="0.001" className="form-control" style={{
        flex: 1
      }} value={displayVal} onChange={e => {
        const val = e.target.value;
        onChange(val === '' ? '' : Math.max(min, parseFloat(val)));
      }} placeholder={`${placeholder} (kg)`} disabled={disabled} min={min} />
        <span style={{
        fontSize: '0.9rem',
        color: 'var(--text-light)',
        fontWeight: 600
      }}>kg</span>
      </div>;
  }
  return <div style={{
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
    width: '100%'
  }}>
      <input type="number" step="1" className="form-control" style={{
      flex: 1
    }} value={value === undefined || value === null ? '' : value} onChange={e => {
      const val = e.target.value;
      onChange(val === '' ? '' : Math.max(min, parseInt(val) || 0));
    }} placeholder={`${placeholder} (u)`} disabled={disabled} min={min} />
      <span style={{
      fontSize: '0.9rem',
      color: 'var(--text-light)',
      fontWeight: 600
    }}>u</span>
    </div>;
};
const flavorGroups = {
  'Dulces de leche': ['Chocotorta', 'Dulce de Leche Biscui', 'Rogel', 'Granizado', 'Coco crunch'],
  'Chocolate': ['Chocolate con almendras', 'Marquise', 'Alfajor', 'Black', 'Patagonia', 'Blanco con maracuyá', 'Dubai'],
  'Cremas': ['Frutilla condensada', 'Coquitas', 'Mascarpone', 'Tiramisú', 'Lemon pie', 'Oreo', 'Menta granizada', 'Snickers', 'Caramel Macchiato', 'Tramontana', 'Cinnamon roll', 'Vainilla french', 'Oreo sin TACC', 'Granizado'],
  'Sin gluten': ['Oreo sin TACC (Sin Gluten)', 'Granizado (Sin Gluten)', 'Frutilla condensada (Sin Gluten)', 'Mascarpone (Sin Gluten)', 'Pistacho (Sin Gluten)', 'Banana split (Sin Gluten)', 'Sambayon (Sin Gluten)'],
  'Frutales al agua': ['Limonada', 'Frutilla citrica', 'Durazno y kiwi', 'Pasion frutal']
};
const getFlavorName = fullName => {
  return fullName.replace(/^Vasqueta /, '').replace(/^Balde /, '').replace(/ \(5-6kg\)$/, '').replace(/ \(4kg\)$/, '').replace(/ \(8kg\)$/, '').replace(/ 5k$/, '').replace(/ 10k$/, '').replace(/ \(5k\)$/, '').replace(/ \(10k\)$/, '').replace(/ 5L$/i, '').replace(/ 10L$/i, '').replace(/ \(5L\)$/i, '').replace(/ \(10L\)$/i);
};
const formatTipo = tipo => {
  if (tipo === 'vasqueta_5_6k') return 'Vasqueta';
  if (tipo === 'balde_4k') return 'Balde 5L';
  if (tipo === 'balde_8k') return 'Balde 10L';
  return tipo?.replace(/_/g, ' ');
};
export const DataProvider = ({ children }) => {
  const {
    toast, setToast,
    loading, setLoading,
    activeTab, setActiveTab,
    showToast
  } = useUI();
  const {
    productos, setProductos,
    sucursales, setSucursales,
    proveedores, setProveedores,
    allProducts, setAllProducts,
    editingProduct, setEditingProduct,
    showProductModal, setShowProductModal,
    editingProv, setEditingProv,
    showProvModal, setShowProvModal,
    catalogSearch, setCatalogSearch,
    catalogCategory, setCatalogCategory,
    catalogSupplier, setCatalogSupplier,
    catalogFormat, setCatalogFormat,
    catalogStatus, setCatalogStatus
  } = useCatalog();
  const {
    stockData, setStockData,
    adminStockMatriz, setAdminStockMatriz,
    stockGroupFilter, setStockGroupFilter,
    iceCreamFormatFilter, setIceCreamFormatFilter,
    adminStockTab, setAdminStockTab,
    adminStockSearch, setAdminStockSearch,
    factoryStockSearch, setFactoryStockSearch,
    branchStockSearch, setBranchStockSearch,
    showEventStock, setShowEventStock,
    showEventStockDepot, setShowEventStockDepot,
    showEditStockModal, setShowEditStockModal,
    editStockForm, setEditStockForm,
    editStockItemDetails, setEditStockItemDetails,
    adminStockSupplierFilter, setAdminStockSupplierFilter
  } = useStock();
  const {
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
  } = useOrders();
  const {
    maquinas, setMaquinas,
    mantenimientos, setMantenimientos,
    maintenanceSubTab, setMaintenanceSubTab,
    selectedMaquinaFilter, setSelectedMaquinaFilter,
    selectedSucursalFilter, setSelectedSucursalFilter,
    selectedTipoEquipoFilter, setSelectedTipoEquipoFilter,
    showMaquinaModal, setShowMaquinaModal,
    editingMaquina, setEditingMaquina,
    showMaintenanceModal, setShowMaintenanceModal,
    editingMaintenance, setEditingMaintenance,
    adminMaquinaSearch, setAdminMaquinaSearch,
    adminMantenimientoSearch, setAdminMantenimientoSearch,
    maquinaForm, setMaquinaForm,
    maintenanceForm, setMaintenanceForm
  } = useMaintenance();
  const {
    user, setUser,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    handleLogin, handleLogout
  } = useAuth(showToast, setActiveTab, setLoading);
const [dashboardStats, setDashboardStats] = useState(null);
const [auditoriaData, setAuditoriaData] = useState([]);
const [auditoriaFilterSucursal, setAuditoriaFilterSucursal] = useState('');
const [auditoriaFilterDays, setAuditoriaFilterDays] = useState('7');
const [prodForm, setProdForm] = useState({
  producto_id: '',
  cantidad: '',
  fecha: getLocalDateString(),
  es_evento: false
});
const [prodWeights, setProdWeights] = useState([]);
const [discrepancias, setDiscrepancias] = useState([]);
const [productionOrders, setProductionOrders] = useState([]);
const [recentLotes, setRecentLotes] = useState([]);
const [branchOtrosForm, setBranchOtrosForm] = useState({
  nombre: '',
  tipo: 'packaging'
});
const [adminHistForm, setAdminHistForm] = useState({
  producto_id: '',
  cantidad: '',
  fecha: getLocalDateString(),
  es_evento: false
});
const [adminHistWeights, setAdminHistWeights] = useState([]);
const [adminHistDefaultWeight, setAdminHistDefaultWeight] = useState('');
const [histCargaMode, setHistCargaMode] = useState('individual'); 
const [histBulkCategory, setHistBulkCategory] = useState('helados');
const [consumoForm, setConsumoForm] = useState({
  producto_id: '',
  cantidad: '',
  es_evento: false
});
const [newProductForm, setNewProductForm] = useState({
  nombre: '',
  categoria: 'helados',
  tipo: 'vasqueta_5_6k',
  proveedor_id: '',
  unidad_medida: 'unidad',
  cant_por_caja: 24,
  cant_por_pack: ''
});
const [provForm, setProvForm] = useState({
  nombre: '',
  cuit: '',
  telefono: '',
  direccion: '',
  email: ''
});
const [prodFormSearch, setProdFormSearch] = useState('');
const [adminFlujoSearch, setAdminFlujoSearch] = useState('');
const [adminDiscrepanciaSearch, setAdminDiscrepanciaSearch] = useState('');
const [adminHistSearch, setAdminHistSearch] = useState('');
const [sucursalConsumoSearch, setSucursalConsumoSearch] = useState('');
const [heladeroEventSearch, setHeladeroEventSearch] = useState('');
const [showSupplierForm, setShowSupplierForm] = useState(false);
const [newSupplierName, setNewSupplierName] = useState('');
const isCategoryVisibleToRole = (category, role) => {
  if (role === 'heladero') return category === 'helados';
  if (role === 'pastelero_helado') return category === 'pasteleria_helada';
  if (role === 'pastelero') return category === 'pasteleria' || category === 'viennoiserie';
  return false;
};
const getTiposPorCategoria = categoria => {
  switch (categoria) {
    case 'helados':
      return [{
        value: 'vasqueta_5_6k',
        label: 'Vasqueta'
      }, {
        value: 'balde_4k',
        label: 'Balde 5L'
      }, {
        value: 'balde_8k',
        label: 'Balde 10L'
      }];
    case 'pasteleria_helada':
      return [{
        value: 'cubanitos',
        label: 'Cubanitos'
      }, {
        value: 'buche_oreo',
        label: 'Buche Oreo'
      }, {
        value: 'buche_tiramisu',
        label: 'Buche Tiramisú'
      }, {
        value: 'paleta',
        label: 'Paleta'
      }, {
        value: 'mini_paleta',
        label: 'Mini Paleta'
      }, {
        value: 'lingote',
        label: 'Lingote'
      }, {
        value: 'mini_cake',
        label: 'Mini Cake'
      }, {
        value: 'sanguche_miga',
        label: 'Sánguches de Miga'
      }];
    case 'pasteleria':
      return [{
        value: 'lemon_pie',
        label: 'Lemon Pie'
      }, {
        value: 'cheesecake',
        label: 'Cheesecake'
      }, {
        value: 'mini_cheesecake',
        label: 'Mini Cheesecake'
      }, {
        value: 'pirinea',
        label: 'Pirinea'
      }, {
        value: 'mini_pirinea',
        label: 'Mini Pirinea'
      }, {
        value: 'torta',
        label: 'Torta'
      }, {
        value: 'alfajor',
        label: 'Alfajor'
      }];
    case 'viennoiserie':
      return [{
        value: 'roll',
        label: 'Roll'
      }, {
        value: 'croissant',
        label: 'Croissant'
      }, {
        value: 'brownie',
        label: 'Brownie'
      }, {
        value: 'viennoiserie_otra',
        label: 'Otro Viennoiserie'
      }];
    case 'termicos':
      return [{
        value: 'vaso_1_bocha',
        label: 'Vaso 1 bocha'
      }, {
        value: 'vaso_2_bochas',
        label: 'Vaso 2 bochas'
      }, {
        value: 'termico_1_4',
        label: 'Térmico 1/4 kg'
      }, {
        value: 'termico_1_2',
        label: 'Térmico 1/2 kg'
      }, {
        value: 'termico_3_4',
        label: 'Térmico 3/4 kg'
      }, {
        value: 'termico_1k',
        label: 'Térmico 1 kg'
      }, {
        value: 'termico_buche',
        label: 'Térmico de Buche'
      }];
    case 'otros':
      return [{
        value: 'packaging',
        label: 'Packaging'
      }, {
        value: 'insumo',
        label: 'Insumo'
      }];
    default:
      return [];
  }
};
const getTareByTipo = tipo => {
  switch (tipo) {
    case 'vasqueta_5_6k':
      return 0.620;
    case 'balde_4k':
      return 0.155;
    case 'balde_8k':
      return 0.270;
    default:
      return 0.0;
  }
};
const isProductVisibleToRole = (p, role) => {
  if (!role) return true;
  if (role === 'heladero') {
    return p.categoria === 'helados';
  }
  if (role === 'pastelero_helado') {
    return p.categoria === 'pasteleria_helada';
  }
  if (role === 'pastelero') {
    return p.categoria === 'pasteleria' || p.categoria === 'panaderia';
  }
  return true;
};

const getProductOptionLabel = p => {
  const formatted = formatTipo(p.tipo);
  if (!formatted) return p.nombre;
  const normNombre = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normTipo = formatted.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normNombre.includes(normTipo) || normTipo.includes(normNombre)) {
    return p.nombre;
  }
  const typeWords = normTipo.split(' ');
  if (typeWords.length > 0 && typeWords[0].length > 3) {
    const firstWordStem = typeWords[0].slice(0, 5);
    if (normNombre.includes(firstWordStem)) {
      return p.nombre;
    }
  }
  return `${p.nombre} (${formatted})`;
};
const getFlavorGroup = fullName => {
  const flavor = getFlavorName(fullName);
  for (const [group, flavorsList] of Object.entries(flavorGroups)) {
    if (flavorsList.includes(flavor)) {
      return group;
    }
  }
  if (flavor.includes('Tramontana') || flavor.includes('Crema') || flavor.includes('Oreo') || flavor.includes('Bosque')) return 'Cremas';
  if (flavor.includes('Chocolate')) return 'Chocolate';
  if (flavor.includes('Dulce de Leche')) return 'Dulces de leche';
  if (flavor.includes('Limón') || flavor.includes('Limonada') || flavor.includes('Frutilla') || flavor.includes('kiwi') || flavor.includes('frutal')) return 'Frutales al agua';
  return 'Otros';
};
const getProductNetWeight = (prodId, tipo) => {
  const productLotes = recentLotes.filter(l => l.producto_id === prodId && l.pesos && l.pesos.length > 0);
  const tare = getTareByTipo(tipo);
  if (productLotes.length > 0) {
    let totalNet = 0;
    let count = 0;
    productLotes.forEach(l => {
      l.pesos.forEach(w => {
        totalNet += Math.max(0, parseFloat(w) - tare);
        count++;
      });
    });
    if (count > 0) {
      return totalNet / count;
    }
  }
  switch (tipo) {
    case 'vasqueta_5_6k':
      return 5.5;
    case 'balde_4k':
      return 4.0;
    case 'balde_8k':
      return 8.0;
    default:
      return 0.0;
  }
};
const getGroupedStock = (forEvent = false) => {
  const iceCreams = productos.filter(p => p.categoria === 'helados');
  const grouped = {};
  iceCreams.forEach(p => {
    const flavor = getFlavorName(p.nombre);
    const group = getFlavorGroup(p.nombre);
    if (!grouped[flavor]) {
      grouped[flavor] = {
        flavor,
        group,
        vasqueta_qty: 0,
        balde_4k_qty: 0,
        balde_8k_qty: 0,
        vasqueta_id: null,
        balde_4k_id: null,
        balde_8k_id: null
      };
    }
    const sData = stockData.find(st => st.producto_id === p.id && st.sucursal_id === 1 && st.es_evento === forEvent);
    const cantidad = sData ? sData.cantidad : 0;
    if (p.tipo === 'vasqueta_5_6k') {
      grouped[flavor].vasqueta_qty += cantidad;
      grouped[flavor].vasqueta_id = p.id;
    } else if (p.tipo === 'balde_4k') {
      grouped[flavor].balde_4k_qty += cantidad;
      grouped[flavor].balde_4k_id = p.id;
    } else if (p.tipo === 'balde_8k') {
      grouped[flavor].balde_8k_qty += cantidad;
      grouped[flavor].balde_8k_id = p.id;
    }
  });
  return Object.values(grouped);
};
const handleCategoriaChange = cat => {
  const tipos = getTiposPorCategoria(cat);
  setNewProductForm({
    ...newProductForm,
    categoria: cat,
    tipo: tipos.length > 0 ? tipos[0].value : ''
  });
};
  const fetchVersionRef = React.useRef(0);
  const fetchData = useCallback(async () => {
    if (!user) return;
    const version = ++fetchVersionRef.current;
    try {
    let pData = [];
    let {
      data: pDataJoin,
      error: pErrJoin
    } = await supabase.from('productos').select('*, proveedores(nombre)');
    if (pErrJoin) {
      const {
        data: pDataSimple,
        error: pErrSimple
      } = await supabase.from('productos').select('*');
      if (pErrSimple) throw pErrSimple;
      pData = (pDataSimple || []).filter(p => p.activo == 1 || p.activo === true || p.activo === 'true' || p.activo === '1');
    } else {
      pData = (pDataJoin || []).filter(p => p.activo == 1 || p.activo === true || p.activo === 'true' || p.activo === '1').map(p => ({
        ...p,
        proveedor_nombre: p.proveedores?.nombre
      }));
    }
    if (version !== fetchVersionRef.current) return;
    setProductos(pData);
    const {
      data: sData,
      error: sErr
    } = await supabase.from('sucursales').select('*');
    if (sErr) throw sErr;
    if (version !== fetchVersionRef.current) return;
    setSucursales(sData || []);
    const {
      data: provData,
      error: provErr
    } = await supabase.from('proveedores').select('*').order('nombre');
    if (version !== fetchVersionRef.current) return;
    if (!provErr) {
      setProveedores(provData || []);
    }
    if (user.rol === 'admin') {
      const {
        data: allPData,
        error: allPErr
      } = await supabase.from('productos').select('*, proveedores(nombre)').order('nombre');
      if (version !== fetchVersionRef.current) return;
      if (!allPErr) {
        const mappedAllP = (allPData || []).map(p => ({
          ...p,
          proveedor_nombre: p.proveedores?.nombre
        }));
        setAllProducts(mappedAllP);
      }
      // Removed v_stock_matriz because it lacks 'tipo' column and causes bugs
      const { data: flujoData, error: flujoErr } = await supabase.from('v_flujo_pedidos_stats').select('*');
      if (version !== fetchVersionRef.current) return;
      if (!flujoErr) setFlujoPedidosStats(flujoData || []);
    }
    const {
      data: lotesRaw,
      error: lotesErr
    } = await supabase.from('lotes_produccion').select(`
          *,
          productos ( nombre, tipo, categoria )
        `).order('id', {
      ascending: false
    }).limit(20);
    if (version !== fetchVersionRef.current) return;
    if (!lotesErr) {
      setRecentLotes(lotesRaw || []);
    }
    let rawStock = [];
    let stockQuery = supabase.from('stock_sucursales').select(`
          sucursal_id,
          sucursales ( nombre ),
          producto_id,
          productos ( nombre, tipo, categoria, activo, proveedor_id, proveedores(nombre) ),
          cantidad,
          es_evento
        `);
    if (user.rol !== 'admin') {
      stockQuery = stockQuery.eq('sucursal_id', user.sucursal_id || 1);
    }
    const {
      data: stockData,
      error: stockErr
    } = await stockQuery;
    if (version !== fetchVersionRef.current) return;
    if (!stockErr) {
      rawStock = stockData || [];
      const stockD = rawStock.filter(s => s.productos && (s.productos.activo == 1 || s.productos.activo === true || s.productos.activo === 'true' || s.productos.activo === '1')).map(s => ({
        sucursal_id: s.sucursal_id,
        sucursal_nombre: s.sucursales?.nombre,
        producto_id: s.producto_id,
        producto_nombre: s.productos?.nombre,
        tipo: s.productos?.tipo,
        categoria: s.productos?.categoria,
        proveedor_id: s.productos?.proveedor_id,
        proveedor_nombre: s.productos?.proveedores?.nombre,
        cantidad: s.cantidad,
        es_evento: s.es_evento
      }));
      setStockData(stockD);
    }
    const {
      data: pedidosData,
      error: pedidosErr
    } = await supabase.from('pedidos').select(`
          *,
          sucursales ( nombre ),
          u_trans: transportista_id ( nombre ),
          u_recib: recibido_por_id ( nombre ),
          pedido_detalles (
            id,
            producto_id,
            cantidad_solicitada,
            cantidad_enviada,
            productos ( nombre, tipo, categoria, unidad_medida )
          )
        `).order('fecha_pedido', {
      ascending: false
    });
    if (version !== fetchVersionRef.current) return;
    if (!pedidosErr) {
      const ordersD = (pedidosData || []).map(o => ({
        ...o,
        sucursal_nombre: o.sucursales?.nombre,
        transportista_nombre: o.u_trans?.nombre,
        recibido_por_nombre: o.u_recib?.nombre
      }));
      setOrders(ordersD);
    }
    const {
      data: pOrdersData,
      error: pOrdersErr
    } = await supabase.from('ordenes_produccion').select(`
          id,
          estado,
          notas,
          fecha_requerida,
          es_evento,
          created_at,
          creado_por_id,
          usuarios ( nombre ),
          orden_produccion_detalles (
            id,
            producto_id,
            cantidad_solicitada,
            cantidad_producida,
            productos ( nombre, categoria, tipo, unidad_medida )
          )
        `).order('created_at', { ascending: false });
    if (version !== fetchVersionRef.current) return;
    if (!pOrdersErr) {
      setProductionOrders(pOrdersData || []);
    }  
    if (user.rol === 'admin') {
      const {
        data: rawAllStock,
        error: allStockErr
      } = await supabase.from('stock_sucursales').select(`
            sucursal_id,
            sucursales ( nombre ),
            producto_id,
            productos ( nombre, tipo, categoria, activo ),
            cantidad,
            es_evento
          `);
      if (allStockErr) throw allStockErr;
      const stockAll = (rawAllStock || []).filter(s => s.productos && (s.productos.activo == 1 || s.productos.activo === true || s.productos.activo === 'true' || s.productos.activo === '1')).map(s => ({
        sucursal_id: s.sucursal_id,
        sucursal_nombre: s.sucursales?.nombre,
        producto_id: s.producto_id,
        producto_nombre: s.productos?.nombre,
        tipo: s.productos?.tipo,
        categoria: s.productos?.categoria,
        cantidad: s.cantidad,
        es_evento: s.es_evento
      }));

      const groupedMatriz = [];
      const branchList = sData || [];
      const prodList = pData || [];
      
      prodList.forEach(prod => {
        const stockPorSucursalComun = {};
        const stockPorSucursalEvento = {};
        
        branchList.forEach(suc => {
          const entryComun = stockAll.find(s => s.sucursal_id === suc.id && s.producto_id === prod.id && !s.es_evento);
          const entryEvento = stockAll.find(s => s.sucursal_id === suc.id && s.producto_id === prod.id && s.es_evento);
          
          stockPorSucursalComun[suc.id] = entryComun ? entryComun.cantidad : 0;
          stockPorSucursalEvento[suc.id] = entryEvento ? entryEvento.cantidad : 0;
        });

        groupedMatriz.push({
          producto_id: prod.id,
          producto_nombre: prod.nombre,
          categoria: prod.categoria,
          tipo: prod.tipo,
          es_evento: false,
          stock_por_sucursal: stockPorSucursalComun
        });
        
        groupedMatriz.push({
          producto_id: prod.id,
          producto_nombre: prod.nombre,
          categoria: prod.categoria,
          tipo: prod.tipo,
          es_evento: true,
          stock_por_sucursal: stockPorSucursalEvento
        });
      });
      setAdminStockMatriz(groupedMatriz);
      const {
        data: allOrders,
        error: allOrdersErr
      } = await supabase.from('pedidos').select('estado');
      if (allOrdersErr) throw allOrdersErr;
      const counts = {};
      (allOrders || []).forEach(o => {
        counts[o.estado] = (counts[o.estado] || 0) + 1;
      });
      const activeOrders = Object.entries(counts).map(([estado, count]) => ({
        estado,
        count
      }));
      const {
        data: rawDiscrepancies,
        error: discErr
      } = await supabase.from('discrepancias').select(`
            *,
            productos ( nombre ),
            pedidos (
              sucursal_destino_id,
              s_dest:sucursal_destino_id ( nombre )
            ),
            usuarios ( nombre )
          `).order('fecha', {
        ascending: false
      }).limit(10);
      if (discErr) throw discErr;
      const discrepancies = (rawDiscrepancies || []).map(d => ({
        ...d,
        producto_nombre: d.productos?.nombre,
        sucursal_nombre: d.pedidos?.s_dest?.nombre,
        reportado_por_nombre: d.usuarios?.nombre
      }));
      const {
        data: rawDetails,
        error: detErr
      } = await supabase.from('pedido_detalles').select(`
            producto_id,
            cantidad_solicitada,
            cantidad_preparada,
            productos ( nombre, tipo, categoria ),
            pedidos!inner ( estado )
          `).eq('pedidos.estado', 'solicitado');
      if (detErr) throw detErr;
      const groupedNeeded = {};
      (rawDetails || []).forEach(d => {
        const prodId = d.producto_id;
        if (!groupedNeeded[prodId]) {
          groupedNeeded[prodId] = {
            producto_id: prodId,
            producto_nombre: d.productos?.nombre,
            tipo: d.productos?.tipo,
            categoria: d.productos?.categoria,
            cantidad_pendiente: 0
          };
        }
        groupedNeeded[prodId].cantidad_pendiente += d.cantidad_solicitada - d.cantidad_preparada;
      });
      const stockFabrica = stockAll.filter(s => s.sucursal_id === 1 && !s.es_evento);
      const stockFabMap = {};
      stockFabrica.forEach(s => stockFabMap[s.producto_id] = s.cantidad);
      const productionNeeded = Object.values(groupedNeeded).map(p => ({
        ...p,
        stock_fabrica: stockFabMap[p.producto_id] || 0
      })).filter(p => p.cantidad_pendiente > p.stock_fabrica);
      if (version !== fetchVersionRef.current) return;
      setDashboardStats({
        stock: stockAll,
        activeOrders,
        discrepancies,
        productionNeeded
      });
    }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [user]);
  const fetchBranchOrderData = useCallback(async () => {
    if (!user || user.rol !== 'sucursal' || activeTab !== 'pedido_nuevo') return;
    try {
      const {
        data: pendsRaw,
        error: pendsErr
      } = await supabase.from('items_pendientes').select(`
            producto_id,
            cantidad,
            productos ( nombre, tipo, categoria )
          `).eq('sucursal_id', user.sucursal_id).eq('es_evento', orderIsEvent);
      if (pendsErr) throw pendsErr;
      const pendsMapped = (pendsRaw || []).map(p => ({
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        nombre: p.productos?.nombre,
        tipo: p.productos?.tipo,
        categoria: p.productos?.categoria
      }));
      setPendingItems(pendsMapped);
      const {
        data: apData,
        error: apErr
      } = await supabase.from('productos').select('id, nombre, tipo, categoria, unidad_medida, cant_por_caja, cant_por_pack, activo');
      if (apErr) throw apErr;
      const activeProds = (apData || []).filter(p => p.activo == 1 || p.activo === true || p.activo === 'true' || p.activo === '1');
      const {
        data: localSt,
        error: lsErr
      } = await supabase.from('stock_sucursales').select('producto_id, cantidad').eq('sucursal_id', user.sucursal_id).eq('es_evento', orderIsEvent);
      if (lsErr) throw lsErr;
      const stockLocalMap = {};
      (localSt || []).forEach(s => stockLocalMap[s.producto_id] = s.cantidad);
      const {
        data: factorySt,
        error: fsErr
      } = await supabase.from('stock_sucursales').select('producto_id, cantidad').eq('sucursal_id', 1).eq('es_evento', orderIsEvent);
      if (fsErr) throw fsErr;
      const stockFabricaMap = {};
      (factorySt || []).forEach(s => stockFabricaMap[s.producto_id] = s.cantidad);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const {
        data: consumosRaw,
        error: cErr
      } = await supabase.from('consumo_diario').select('producto_id, cantidad').eq('sucursal_id', user.sucursal_id).eq('es_evento', false).gte('fecha', sevenDaysAgo.toISOString());
      if (cErr) throw cErr;
      const consumosSum = {};
      const consumosCount = {};
      (consumosRaw || []).forEach(c => {
        consumosSum[c.producto_id] = (consumosSum[c.producto_id] || 0) + c.cantidad;
        consumosCount[c.producto_id] = (consumosCount[c.producto_id] || 0) + 1;
      });
      const suggestionsD = (activeProds || []).map(prod => {
        const stockActual = stockLocalMap[prod.id] || 0;
        const stockFac = stockFabricaMap[prod.id] || 0;
        const sum = consumosSum[prod.id] || 0;
        const count = consumosCount[prod.id] || 0;
        const promedioConsumo = count > 0 ? sum / count : 0;
        let cantidadSugerida = Math.ceil(promedioConsumo * 3) - stockActual;
        if (cantidadSugerida < 0) cantidadSugerida = 0;
        if (promedioConsumo === 0 && stockActual < 2) {
          cantidadSugerida = 3;
        }
        return {
          producto_id: prod.id,
          nombre: prod.nombre,
          tipo: prod.tipo,
          categoria: prod.categoria,
          stock_actual: stockActual,
          stock_fabrica: stockFac,
          consumo_promedio_diario: parseFloat(promedioConsumo.toFixed(2)),
          cantidad_sugerida: cantidadSugerida,
          alerta_stock_fabrica: stockFac < cantidadSugerida
        };
      });
      setSuggestions(suggestionsD);
    } catch (err) {
      console.error('Error fetching branch order data:', err);
    }
  }, [user, activeTab, orderIsEvent]);
  useEffect(() => {
    fetchBranchOrderData();
  }, [fetchBranchOrderData]);
useEffect(() => {
  let isMounted = true;
  let timeoutId;
  const pollData = async () => {
    if (!isMounted) return;
    await fetchData();
    if (isMounted) {
      timeoutId = setTimeout(pollData, 15000);
    }
  };
  pollData();
  return () => {
    isMounted = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [fetchData]);
const fetchMaquinasYMantenimientos = useCallback(async () => {
  if (!user || user.rol !== 'admin') return;
  try {
    const {
      data: maqData,
      error: maqErr
    } = await supabase.from('maquinas').select(`
          *,
          sucursales ( nombre )
        `).order('nombre');
    if (maqErr) throw maqErr;
    const mappedMaq = (maqData || []).map(m => ({
      ...m,
      sucursal_nombre: m.sucursales?.nombre || 'Sin Sucursal'
    }));
    setMaquinas(mappedMaq);
    const {
      data: mantData,
      error: mantErr
    } = await supabase.from('mantenimientos').select(`
          *,
          maquinas ( nombre, marca, modelo, tipo_equipo )
        `).order('fecha', {
      ascending: false
    });
    if (mantErr) throw mantErr;
    const mappedMant = (mantData || []).map(m => ({
      ...m,
      maquina_nombre: m.maquinas?.nombre || 'Máquina Eliminada',
      maquina_marca: m.maquinas?.marca || '',
      maquina_modelo: m.maquinas?.modelo || '',
      maquina_tipo_equipo: m.maquinas?.tipo_equipo || ''
    }));
    setMantenimientos(mappedMant);
  } catch (err) {
    console.error('Error fetching machines/maintenance:', err);
  }
}, [user]);
useEffect(() => {
  if (activeTab === 'maquinas') {
    fetchMaquinasYMantenimientos();
  }
}, [activeTab, fetchMaquinasYMantenimientos]);
const fetchAuditoriaData = useCallback(async () => {
  if (!user || user.rol !== 'admin') return;
  try {
    setLoading(true);
    let query = supabase.from('v_auditoria_consumo').select('*');
    if (auditoriaFilterSucursal) {
      query = query.eq('sucursal_id', auditoriaFilterSucursal);
    }
    if (auditoriaFilterDays) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - parseInt(auditoriaFilterDays));
      query = query.gte('fecha', pastDate.toISOString());
    }
    const {
      data,
      error
    } = await query.order('fecha', {
      ascending: false
    });
    if (error) throw error;
    setAuditoriaData(data || []);
  } catch (err) {
    showToast('Error al cargar auditoría: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}, [user, auditoriaFilterSucursal, auditoriaFilterDays]);
useEffect(() => {
  if (activeTab === 'auditoria_consumo') {
    fetchAuditoriaData();
  }
}, [activeTab, fetchAuditoriaData]);
const handleDownloadAuditoriaCSV = () => {
  if (auditoriaData.length === 0) return;
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Fecha,Sucursal,Producto,Cantidad,Unidad,Registrado Por\n";
  auditoriaData.forEach(row => {
    const prod = productos.find(p => p.id === row.producto_id);
    const suc = sucursales.find(s => s.id === row.sucursal_id);
    const isWeight = prod?.unidad_medida === 'peso';
    const qty = isWeight ? parseFloat(row.cantidad).toFixed(3) : row.cantidad;
    const unit = isWeight ? "kg" : "unidades";
    const pName = prod ? prod.nombre.replace(/,/g, '') : "Desconocido";
    const sName = suc ? suc.nombre.replace(/,/g, '') : "Desconocido";
    const fDate = new Date(row.fecha).toLocaleString().replace(/,/g, '');
    const uName = row.usuarios?.nombre ? row.usuarios.nombre.replace(/,/g, '') : '';
    csvContent += `${fDate},${sName},${pName},${qty},${unit},${uName}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `auditoria_consumo_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
const handleProductionSubmit = async e => {
  e.preventDefault();
  if (!prodForm.producto_id || !prodForm.cantidad) return;
  setLoading(true);
  try {
    const pId = parseInt(prodForm.producto_id);
    const qty = parseInt(prodForm.cantidad);
    const pDate = prodForm.fecha ? new Date(prodForm.fecha) : new Date();
    const dateStr = pDate.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const codigo_lote = `L-${dateStr}-${rand}`;
    const selectedProd = productos.find(p => p.id === pId);
    let pesosArray = [];
    if (selectedProd && selectedProd.categoria === 'helados') {
      pesosArray = prodWeights.map(w => parseFloat(w) || 0);
      if (pesosArray.length !== qty || pesosArray.some(w => w <= 0)) {
        throw new Error('Por favor, ingresa un peso válido mayor a 0 para cada unidad.');
      }
    }
    const isEvent = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k' ? false : prodForm.es_evento || false;
    const {
      error: rpcErr
    } = await supabase.rpc('registrar_produccion', {
      p_codigo_lote: codigo_lote,
      p_producto_id: pId,
      p_cantidad: qty,
      p_pesos: pesosArray,
      p_fecha_produccion: pDate.toISOString(),
      p_creado_por: user.id,
      p_es_evento: isEvent
    });
    if (rpcErr) throw rpcErr;
    showToast(`Producción registrada con Lote ${codigo_lote}. Stock de fábrica actualizado.`);
    setProdForm({
      producto_id: '',
      cantidad: '',
      fecha: getLocalDateString(),
      es_evento: false
    });
    setProdWeights([]);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleAdminHistSubmit = async e => {
  e.preventDefault();
  if (!adminHistForm.producto_id || !adminHistForm.cantidad || !adminHistForm.fecha) return;
  setLoading(true);
  try {
    const pId = parseInt(adminHistForm.producto_id);
    const qty = parseInt(adminHistForm.cantidad);
    const pDate = new Date(adminHistForm.fecha);
    const dateStr = pDate.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const codigo_lote = `L-${dateStr}-${rand}`;
    const selectedProd = productos.find(p => p.id === pId);
    let pesosArray = [];
    if (selectedProd && selectedProd.categoria === 'helados') {
      pesosArray = adminHistWeights.map(w => parseFloat(w) || 0);
      if (pesosArray.length !== qty || pesosArray.some(w => w <= 0)) {
        throw new Error('Por favor, ingresa un peso válido mayor a 0 para cada unidad.');
      }
    }
    const isEvent = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k' ? false : adminHistForm.es_evento || false;
    const {
      error: rpcErr
    } = await supabase.rpc('registrar_produccion', {
      p_codigo_lote: codigo_lote,
      p_producto_id: pId,
      p_cantidad: qty,
      p_pesos: pesosArray,
      p_fecha_produccion: pDate.toISOString(),
      p_creado_por: user.id,
      p_es_evento: isEvent
    });
    if (rpcErr) throw rpcErr;
    showToast(`Producción histórica registrada con Lote ${codigo_lote}. Stock de fábrica actualizado.`);
    setAdminHistForm({
      producto_id: '',
      cantidad: '',
      fecha: getLocalDateString(),
      es_evento: false
    });
    setAdminHistWeights([]);
    setAdminHistDefaultWeight('');
    setAdminHistSearch('');
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleTranspCargaSubmit = async e => {
  e.preventDefault();
  if (!transpCargaForm.producto_id || !transpCargaForm.cantidad || !transpCargaForm.fecha || !transpCargaForm.proveedor_id) return;
  setLoading(true);
  try {
    const pId = parseInt(transpCargaForm.producto_id);
    const inputQty = parseFloat(transpCargaForm.cantidad);
    const pDate = new Date(transpCargaForm.fecha);
    const selectedProd = productos.find(p => p.id === pId);
    const isWeight = selectedProd?.unidad_medida === 'peso';
    const finalQty = isWeight ? parseFloat(inputQty) : inputQty;
    const dateStr = pDate.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const codigo_lote = `C-${dateStr}-${rand}`; 
    const {
      error: rpcErr
    } = await supabase.rpc('registrar_produccion', {
      p_codigo_lote: codigo_lote,
      p_producto_id: pId,
      p_cantidad: finalQty,
      p_pesos: [],
      p_fecha_produccion: pDate.toISOString(),
      p_creado_por: user.id,
      p_es_evento: false
    });
    if (rpcErr) throw rpcErr;
    showToast(`Ingreso de mercadería registrado (Ref: ${codigo_lote}). Stock de fábrica actualizado.`);
    setTranspCargaForm({
      producto_id: '',
      proveedor_id: '',
      cantidad: '',
      fecha: getLocalDateString()
    });
    fetchData();
  } catch (err) {
    console.error(err);
    showToast('Error al registrar la carga: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleProvSubmit = async e => {
  e.preventDefault();
  if (!provForm.nombre.trim()) return;
  setLoading(true);
  try {
    const payload = {
      nombre: provForm.nombre.trim(),
      cuit: provForm.cuit?.trim() || null,
      telefono: provForm.telefono?.trim() || null,
      direccion: provForm.direccion?.trim() || null,
      email: provForm.email?.trim() || null
    };
    if (editingProv) {
      const {
        error
      } = await supabase.from('proveedores').update(payload).eq('id', editingProv.id);
      if (error) throw error;
      showToast('Proveedor actualizado con éxito.');
    } else {
      const {
        error
      } = await supabase.from('proveedores').insert(payload);
      if (error) throw error;
      showToast('Proveedor creado con éxito.');
    }
    setShowProvModal(false);
    setEditingProv(null);
    setProvForm({
      nombre: '',
      cuit: '',
      telefono: '',
      direccion: '',
      email: ''
    });
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleProvDelete = async (id, nombre) => {
  if (!window.confirm(`¿Estás seguro de eliminar el proveedor "${nombre}"?\nEsto fallará si existen productos asociados a él.`)) return;
  setLoading(true);
  try {
    const {
      error
    } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw error;
    showToast('Proveedor eliminado con éxito.');
    fetchData();
  } catch (err) {
    if (err.message.includes('violates foreign key constraint') || err.code === '23503') {
      showToast('No se puede eliminar el proveedor porque tiene productos asociados.', 'error');
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    setLoading(false);
  }
};
const handleDownloadHistTemplate = () => {
  const prods = productos.filter(p => p.categoria === histBulkCategory && p.activo === 1);
  const headers = ['ID_Producto', 'Nombre', 'Formato', 'Cantidad', 'Peso_Bruto_Unitario_Opcional', 'Fecha_Opcional', 'Destinar_A_Eventos_SI_NO'];
  let csvContent = '\uFEFF' + headers.join(';') + '\n';
  prods.forEach(p => {
    let suggestedWeight = '';
    if (p.categoria === 'helados') {
      if (p.tipo === 'vasqueta_5_6k') suggestedWeight = '6.120';else if (p.tipo === 'balde_4k') suggestedWeight = '4.155';else if (p.tipo === 'balde_8k') suggestedWeight = '8.270';
    }
    const row = [p.id, p.nombre.replace(/;/g, ','),
    formatTipo(p.tipo) || '', '0', suggestedWeight, getLocalDateString(), 'NO'];
    csvContent += row.join(';') + '\n';
  });
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `plantilla_carga_historica_${histBulkCategory}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Plantilla descargada para la categoría ${categories.find(c => c.id === histBulkCategory)?.name}.`);
};
const handleUploadHistTemplate = async e => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const reader = new FileReader();
  reader.onload = async event => {
    try {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        throw new Error('El archivo está vacío o solo contiene la cabecera.');
      }
      const firstLine = lines[0];
      let delimiter = ';';
      if (firstLine.includes(';')) {
        delimiter = ';';
      } else if (firstLine.includes(',')) {
        delimiter = ',';
      }
      const rowsToProcess = [];
      let skippedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 4) continue;
        const pId = parseInt(cols[0]);
        const qty = parseInt(cols[3]);
        if (isNaN(pId) || isNaN(qty) || qty <= 0) {
          skippedCount++;
          continue;
        }
        const product = productos.find(p => p.id === pId);
        if (!product) {
          throw new Error(`Línea ${i + 1}: El producto con ID ${pId} no se encuentra en el sistema.`);
        }
        const rawWeights = cols[4] || '';
        const dateVal = cols[5] ? new Date(cols[5]) : new Date();
        const esEventoVal = cols[6] && (cols[6].toUpperCase() === 'SI' || cols[6].toUpperCase() === 'TRUE');
        rowsToProcess.push({
          product,
          qty,
          rawWeights,
          dateVal: isNaN(dateVal.getTime()) ? new Date() : dateVal,
          esEventoVal
        });
      }
      if (rowsToProcess.length === 0) {
        throw new Error('No se encontraron filas con "Cantidad" mayor a 0 para procesar.');
      }
      let successCount = 0;
      let failCount = 0;
      let lastErrorMsg = '';
      for (const row of rowsToProcess) {
        try {
          const {
            product,
            qty,
            rawWeights,
            dateVal,
            esEventoVal
          } = row;
          const dateStr = dateVal.toISOString().slice(0, 10).replace(/-/g, '');
          const rand = Math.floor(1000 + Math.random() * 9000);
          const codigo_lote = `L-${dateStr}-${rand}`;
          let pesosArray = [];
          if (product.categoria === 'helados') {
            const tare = getTareByTipo(product.tipo);
            const fallbackGross = tare + getProductNetWeight(product.id, product.tipo);
            if (rawWeights) {
              const weightStrings = rawWeights.split(/[;/|\s]+/).filter(w => w.trim() !== '');
              if (weightStrings.length > 1) {
                pesosArray = weightStrings.map(w => {
                  const cleaned = w.replace(',', '.');
                  return parseFloat(cleaned) || fallbackGross;
                });
                while (pesosArray.length < qty) {
                  pesosArray.push(pesosArray[pesosArray.length - 1] || fallbackGross);
                }
                if (pesosArray.length > qty) {
                  pesosArray = pesosArray.slice(0, qty);
                }
              } else {
                const cleaned = rawWeights.replace(',', '.');
                const gross = parseFloat(cleaned) || fallbackGross;
                pesosArray = Array(qty).fill(gross);
              }
            } else {
              pesosArray = Array(qty).fill(fallbackGross);
            }
            if (pesosArray.some(w => w <= 0)) {
              throw new Error(`Pesos brutos inválidos calculados para el helado ${product.nombre}`);
            }
          }
          const isEvent = product.categoria === 'helados' && product.tipo === 'vasqueta_5_6k' ? false : esEventoVal;
          const {
            error: rpcErr
          } = await supabase.rpc('registrar_produccion', {
            p_codigo_lote: codigo_lote,
            p_producto_id: product.id,
            p_cantidad: qty,
            p_pesos: pesosArray,
            p_fecha_produccion: dateVal.toISOString(),
            p_creado_por: user.id,
            p_es_evento: isEvent
          });
          if (rpcErr) throw rpcErr;
          successCount++;
        } catch (err) {
          failCount++;
          lastErrorMsg = err.message || String(err);
        }
      }
      showToast(`Carga masiva finalizada. Éxito: ${successCount} productos. Fallidos: ${failCount}.${failCount > 0 ? ` Último error: ${lastErrorMsg}` : ''}`, failCount > 0 ? 'error' : 'success');
      fetchData();
      e.target.value = '';
    } catch (err) {
      showToast(err.message || 'Error al procesar la planilla.', 'error');
      e.target.value = '';
    } finally {
      setLoading(false);
    }
  };
  reader.onerror = () => {
    showToast('Error al leer el archivo.', 'error');
    setLoading(false);
    e.target.value = '';
  };
  reader.readAsText(file);
};
const handleConsumoSubmit = async e => {
  e.preventDefault();
  if (!consumoForm.producto_id || !consumoForm.cantidad) return;
  setLoading(true);
  try {
    const pId = parseInt(consumoForm.producto_id);
    const qty = parseInt(consumoForm.cantidad);
    const isEvent = consumoForm.es_evento || false;
    const {
      error: rpcErr
    } = await supabase.rpc('registrar_consumo', {
      p_sucursal_id: user.sucursal_id,
      p_producto_id: pId,
      p_cantidad: qty,
      p_es_evento: isEvent,
      p_creado_por: user.id
    });
    if (rpcErr) throw rpcErr;
    showToast('Consumo registrado exitosamente.');
    setConsumoForm({
      producto_id: '',
      cantidad: '',
      es_evento: false
    });
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleCreateOrder = async () => {
  const items = Object.entries(orderItems).map(([prodId, qty]) => ({
    producto_id: parseInt(prodId),
    cantidad_solicitada: parseInt(qty)
  })).filter(item => item.cantidad_solicitada > 0);
  if (items.length === 0) {
    showToast('Por favor, selecciona al menos 1 producto con cantidad mayor a 0.', 'error');
    return;
  }
  setLoading(true);
  try {
    const {
      data: newPedido,
      error: insErr
    } = await supabase.from('pedidos').insert({
      sucursal_destino_id: user.sucursal_id,
      creado_por_id: user.id,
      es_evento: user.rol === 'admin' || user.rol === 'heladero' ? orderIsEvent : false,
      estado: 'solicitado'
    }).select('id').single();
    if (insErr) throw insErr;
    const pedido_id = newPedido.id;
    const details = items.map(item => ({
      pedido_id,
      producto_id: item.producto_id,
      cantidad_solicitada: item.cantidad_solicitada,
      cantidad_preparada: item.cantidad_solicitada
    }));
    const {
      error: detErr
    } = await supabase.from('pedido_detalles').insert(details);
    if (detErr) throw detErr;
    const orderedProdIds = items.map(item => item.producto_id);
    const {
      error: delPendErr
    } = await supabase.from('items_pendientes').delete().eq('sucursal_id', user.sucursal_id).eq('es_evento', orderIsEvent).in('producto_id', orderedProdIds);
    if (delPendErr) throw delPendErr;
    showToast('Pedido solicitado a Fábrica.');
    setOrderIsEvent(false);
    setOrderItems({});
    setActiveTab('pedidos_lista');
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleAdminCreateOrder = async () => {
  const items = Object.entries(adminOrderItems).map(([prodId, qty]) => ({
    producto_id: parseInt(prodId),
    cantidad_solicitada: parseInt(qty)
  })).filter(item => item.cantidad_solicitada > 0);
  if (!adminOrderDestination) {
    showToast('Por favor, selecciona una sucursal o depósito de destino.', 'error');
    return;
  }
  if (items.length === 0) {
    showToast('Por favor, selecciona al menos 1 producto con cantidad mayor a 0.', 'error');
    return;
  }
  setLoading(true);
  try {
    if (adminOrderIsEvent && adminOrderSolicitFabrication) {
      const {
        data: newPedido,
        error: insErr
      } = await supabase.from('pedidos').insert({
        sucursal_destino_id: parseInt(adminOrderDestination),
        creado_por_id: user.id,
        es_evento: true,
        estado: 'solicitado'
      }).select('id').single();
      if (insErr) throw insErr;
      const pedido_id = newPedido.id;
      const details = items.map(item => ({
        pedido_id,
        producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad_solicitada,
        cantidad_preparada: item.cantidad_solicitada
      }));
      const {
        error: detErr
      } = await supabase.from('pedido_detalles').insert(details);
      if (detErr) throw detErr;
      showToast(`Pedido de Fabricación #${pedido_id} enviado al heladero con éxito.`);
    } else {
      const {
        data: pedido_id,
        error: rpcErr
      } = await supabase.rpc('crear_y_preparar_pedido_admin', {
        p_sucursal_destino_id: parseInt(adminOrderDestination),
        p_creado_por_id: user.id,
        p_es_evento: adminOrderIsEvent,
        p_items: items
      });
      if (rpcErr) throw rpcErr;
      showToast(`Pedido #${pedido_id} creado y preparado con éxito.`);
    }
    setAdminOrderItems({});
    setAdminOrderDestination('');
    setAdminOrderIsEvent(false);
    setAdminOrderSolicitFabrication(false);
    setActiveTab('flujo'); 
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const applyAllSuggestions = () => {
  const items = {};
  suggestions.forEach(s => {
    items[s.producto_id] = s.cantidad_sugerida;
  });
  setOrderItems(items);
  showToast('Sugerencias aplicadas. Revisa las cantidades antes de enviar.');
};
const handleRetiroInternoSubmit = async e => {
  e.preventDefault();
  const itemsList = Object.entries(retiroItems).filter(([_, qty]) => qty > 0).map(([pId, qty]) => ({
    producto_id: parseInt(pId),
    cantidad: qty
  }));
  if (itemsList.length === 0) {
    showToast('No has seleccionado ningún producto.', 'warning');
    return;
  }
  setLoading(true);
  try {
    const {
      data: pedido_id,
      error: rpcErr
    } = await supabase.rpc('crear_y_preparar_pedido_admin', {
      p_sucursal_destino_id: user.sucursal_id,
      p_creado_por_id: user.id,
      p_es_evento: false,
      p_items: itemsList
    });
    if (rpcErr) throw rpcErr;
    const receivePayload = itemsList.map(it => ({
      producto_id: it.producto_id,
      cantidad_recibida: it.cantidad,
      motivo_discrepancia: null
    }));
    const {
      error: recErr
    } = await supabase.rpc('recibir_pedido', {
      p_pedido_id: pedido_id,
      p_recibido_por_id: user.id,
      p_items: receivePayload
    });
    if (recErr) throw recErr;
    showToast(`Retiro interno registrado exitosamente (Ref: #${pedido_id}).`);
    setRetiroItems({});
    fetchData();
  } catch (err) {
    showToast('Error en retiro interno: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const viewOrderDetail = async pedidoId => {
  try {
    const {
      data: order,
      error: oErr
    } = await supabase.from('pedidos').select(`
          *,
          s_orig:sucursal_origen_id ( nombre ),
          s_dest:sucursal_destino_id ( nombre )
        `).eq('id', pedidoId).single();
    if (oErr) throw oErr;
    if (!order) throw new Error('Pedido no encontrado.');
    const {
      data: items,
      error: iErr
    } = await supabase.from('pedido_detalles').select(`
          *,
          productos ( nombre, tipo, categoria )
        `).eq('pedido_id', pedidoId);
    if (iErr) throw iErr;
    const {
      data: allFactoryStock,
      error: fsErr
    } = await supabase.from('stock_sucursales').select('producto_id, cantidad, es_evento').eq('sucursal_id', 1);
    if (fsErr) throw fsErr;
    const eventStockMap = {};
    const commonStockMap = {};
    (allFactoryStock || []).forEach(s => {
      if (s.es_evento) {
        eventStockMap[s.producto_id] = s.cantidad;
      } else {
        commonStockMap[s.producto_id] = s.cantidad;
      }
    });
    let defaultSource = 'evento';
    if (order.es_evento) {
      let totalQtyInEvent = 0;
      let totalQtyInCommon = 0;
      (items || []).forEach(it => {
        const qtyEvent = eventStockMap[it.producto_id] || 0;
        const qtyCommon = commonStockMap[it.producto_id] || 0;
        totalQtyInEvent += Math.min(it.cantidad_solicitada, qtyEvent);
        totalQtyInCommon += Math.min(it.cantidad_solicitada, qtyCommon);
      });
      if (totalQtyInCommon > totalQtyInEvent) {
        defaultSource = 'comun';
      }
    }
    setPrepareStockSource(defaultSource);
    const activeStockMap = defaultSource === 'evento' ? eventStockMap : commonStockMap;
    const itemsMapped = (items || []).map(it => ({
      ...it,
      producto_name: it.productos?.nombre,
      producto_nombre: it.productos?.nombre,
      tipo: it.productos?.tipo,
      categoria: it.productos?.categoria,
      stock_fabrica: activeStockMap[it.producto_id] || 0
    }));
    const orderData = {
      ...order,
      origen_nombre: order.s_orig?.nombre,
      destino_nombre: order.s_dest?.nombre,
      items: itemsMapped
    };
    setSelectedPedido(orderData);
    const loads = {};
    itemsMapped.forEach(it => {
      loads[it.producto_id] = it.cantidad_preparada;
    });
    setLoadItems(loads);
    const recs = {};
    const reasons = {};
    itemsMapped.forEach(it => {
      recs[it.producto_id] = it.cantidad_cargada > 0 ? it.cantidad_cargada : it.cantidad_preparada;
      reasons[it.producto_id] = '';
    });
    setReceiveItems(recs);
    setReceiveReasons(reasons);
  } catch (err) {
    showToast(err.message || 'Error al cargar detalle del pedido.', 'error');
  }
};
const handlePrepareOrder = async () => {
  if (!selectedPedido) return;
  setLoading(true);
  try {
    const originalIsEvent = selectedPedido.es_evento;
    const targetEsEvento = prepareStockSource === 'evento'; 
    const {
      data: allStock,
      error: stockFetchErr
    } = await supabase.from('stock_sucursales').select('producto_id, cantidad, es_evento').eq('sucursal_id', 1);
    if (stockFetchErr) throw stockFetchErr;
    const eventStockMap = {};
    const commonStockMap = {};
    allStock.forEach(s => {
      if (s.es_evento) {
        eventStockMap[s.producto_id] = s.cantidad;
      } else {
        commonStockMap[s.producto_id] = s.cantidad;
      }
    });
    for (const item of selectedPedido.items) {
      const pId = item.producto_id;
      const requestedQty = item.cantidad_solicitada;
      const qtyPrimary = (targetEsEvento ? eventStockMap[pId] : commonStockMap[pId]) ?? 0;
      const qtySecondary = (targetEsEvento ? commonStockMap[pId] : eventStockMap[pId]) ?? 0;
      if (qtyPrimary >= requestedQty) {
        continue;
      }
      const diff = requestedQty - qtyPrimary;
      const takeFromSecondary = Math.min(diff, qtySecondary);
      let finalPrimaryQty = qtyPrimary;
      if (takeFromSecondary > 0) {
        const newQtySecondary = qtySecondary - takeFromSecondary;
        const {
          error: updSecErr
        } = await supabase.from('stock_sucursales').update({
          cantidad: newQtySecondary
        }).eq('sucursal_id', 1).eq('producto_id', pId).eq('es_evento', !targetEsEvento);
        if (updSecErr) throw updSecErr;
        finalPrimaryQty += takeFromSecondary;
      }
      if (finalPrimaryQty < requestedQty) {
        finalPrimaryQty = requestedQty;
      }
      const hasPrimaryRow = targetEsEvento ? eventStockMap[pId] !== undefined : commonStockMap[pId] !== undefined;
      if (hasPrimaryRow) {
        const {
          error: updPriErr
        } = await supabase.from('stock_sucursales').update({
          cantidad: finalPrimaryQty
        }).eq('sucursal_id', 1).eq('producto_id', pId).eq('es_evento', targetEsEvento);
        if (updPriErr) throw updPriErr;
      } else {
        const {
          error: insPriErr
        } = await supabase.from('stock_sucursales').insert({
          sucursal_id: 1,
          producto_id: pId,
          cantidad: finalPrimaryQty,
          es_evento: targetEsEvento
        });
        if (insPriErr) throw insPriErr;
      }
    }
    const {
      error: updErr
    } = await supabase.from('pedidos').update({
      es_evento: targetEsEvento
    }).eq('id', selectedPedido.id);
    if (updErr) throw updErr;
    const {
      error: rpcErr
    } = await supabase.rpc('preparar_pedido', {
      p_pedido_id: selectedPedido.id,
      p_preparado_por_id: user.id
    });
    if (rpcErr) {
      await supabase.from('pedidos').update({
        es_evento: originalIsEvent
      }).eq('id', selectedPedido.id);
      throw rpcErr;
    }
    if (originalIsEvent !== targetEsEvento) {
      const {
        error: restoreErr
      } = await supabase.from('pedidos').update({
        es_evento: originalIsEvent
      }).eq('id', selectedPedido.id);
      if (restoreErr) throw restoreErr;
    }
    showToast('Pedido preparado y stock de fábrica reservado.');
    setSelectedPedido(null);
    setPrepareStockSource('evento');
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleConfirmLoad = async () => {
  if (!selectedPedido) return;
  const items = Object.entries(loadItems).map(([prodId, qty]) => ({
    producto_id: parseInt(prodId),
    cantidad_cargada: parseInt(qty)
  }));
  setLoading(true);
  try {
    const {
      error: rpcErr
    } = await supabase.rpc('confirmar_carga_pedido', {
      p_pedido_id: selectedPedido.id,
      p_transportista_id: user.id,
      p_items: items
    });
    if (rpcErr) throw rpcErr;
    showToast('Pedido cargado en camión. Estado cambiado a En Tránsito.');
    setSelectedPedido(null);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleReportLoss = async e => {
  e.preventDefault();
  if (!transitLoss.producto_id || !transitLoss.cantidad_perdida) return;
  setLoading(true);
  try {
    const pId = parseInt(transitLoss.producto_id);
    const qtyLost = parseInt(transitLoss.cantidad_perdida);
    const motivo = transitLoss.motivo || 'Rotura en viaje';
    const itemDetail = selectedPedido.items.find(it => it.producto_id === pId);
    const currentCargado = itemDetail ? itemDetail.cantidad_cargada : 0;
    const {
      error: updDetErr
    } = await supabase.from('pedido_detalles').update({
      cantidad_cargada: Math.max(0, currentCargado - qtyLost)
    }).eq('pedido_id', selectedPedido.id).eq('producto_id', pId);
    if (updDetErr) throw updDetErr;
    const {
      error: discErr
    } = await supabase.from('discrepancias').insert({
      pedido_id: selectedPedido.id,
      producto_id: pId,
      tipo: 'transito',
      cantidad_perdida: qtyLost,
      motivo,
      reportado_por_id: user.id,
      es_evento: selectedPedido.es_evento || false
    });
    if (discErr) throw discErr;
    showToast('Merma en tránsito registrada exitosamente.');
    setShowLossModal(false);
    setLoadItems(prev => ({
      ...prev,
      [pId]: Math.max(0, (prev[pId] || 0) - qtyLost)
    }));
    viewOrderDetail(selectedPedido.id);
    setTransitLoss({
      producto_id: '',
      cantidad_perdida: '',
      motivo: ''
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleMarkDelivered = async () => {
  if (!selectedPedido) return;
  setLoading(true);
  try {
    const {
      error: updOrderErr
    } = await supabase.from('pedidos').update({
      fecha_entrega: new Date().toISOString()
    }).eq('id', selectedPedido.id);
    if (updOrderErr) throw updOrderErr;
    showToast('Pedido marcado como entregado físicamente. Pendiente confirmación de sucursal.');
    setSelectedPedido(null);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleConfirmReceive = async () => {
  if (!selectedPedido) return;
  const items = Object.entries(receiveItems).map(([prodId, qty]) => ({
    producto_id: parseInt(prodId),
    cantidad_recibida: parseInt(qty),
    motivo_diferencia: receiveReasons[prodId] || ''
  }));
  setLoading(true);
  try {
    const {
      error: rpcErr
    } = await supabase.rpc('recibir_pedido', {
      p_pedido_id: selectedPedido.id,
      p_recibido_por_id: user.id,
      p_items: items
    });
    if (rpcErr) throw rpcErr;
    let hasDiscrepancies = false;
    for (let item of items) {
      const origDetail = selectedPedido.items.find(it => it.producto_id === item.producto_id);
      const loadedQty = selectedPedido.estado === 'solicitado' ? item.cantidad_recibida : origDetail ? origDetail.cantidad_cargada > 0 ? origDetail.cantidad_cargada : origDetail.cantidad_preparada : 0;
      if (loadedQty - item.cantidad_recibida !== 0) {
        hasDiscrepancies = true;
        break;
      }
    }
    const finalEstado = hasDiscrepancies ? 'con_discrepancia' : 'entregado';
    showToast(`Pedido recibido. Estado final: ${finalEstado === 'entregado' ? 'Entregado OK' : 'Entregado con Discrepancias'}.`);
    setSelectedPedido(null);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleCreateSupplier = async () => {
  if (!newSupplierName.trim()) return;
  setLoading(true);
  try {
    const {
      data: newProv,
      error: insErr
    } = await supabase.from('proveedores').insert({
      nombre: newSupplierName.trim()
    }).select('*').single();
    if (insErr) throw insErr;
    showToast(`Proveedor "${newProv.nombre}" creado con éxito.`);
    setNewSupplierName('');
    setShowSupplierForm(false);
    setProveedores(prev => [...prev, newProv].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNewProductForm(prev => ({
      ...prev,
      proveedor_id: newProv.id
    }));
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleNewProductSubmit = async e => {
  e.preventDefault();
  if (!newProductForm.nombre) return;
  setLoading(true);
  try {
    const {
      data: newProd,
      error: insErr
    } = await supabase.from('productos').insert({
      nombre: newProductForm.nombre,
      categoria: newProductForm.categoria,
      tipo: newProductForm.tipo,
      proveedor_id: newProductForm.proveedor_id ? parseInt(newProductForm.proveedor_id) : null,
      unidad_medida: newProductForm.unidad_medida,
      cant_por_caja: newProductForm.cant_por_caja ? parseInt(newProductForm.cant_por_caja) : 24,
      cant_por_pack: newProductForm.cant_por_pack ? parseInt(newProductForm.cant_por_pack) : null
    }).select('id').single();
    if (insErr) throw insErr;
    const newProductId = newProd.id;
    const {
      data: branches,
      error: bErr
    } = await supabase.from('sucursales').select('id');
    if (bErr) throw bErr;
    const stockInserts = (branches || []).map(b => ({
      sucursal_id: b.id,
      producto_id: newProductId,
      cantidad: 0
    }));
    const {
      error: sErr
    } = await supabase.from('stock_sucursales').insert(stockInserts);
    if (sErr) throw sErr;
    showToast('Producto creado exitosamente.');
    setNewProductForm({
      nombre: '',
      categoria: 'helados',
      tipo: 'vasqueta_5_6k',
      proveedor_id: '',
      unidad_medida: 'unidad',
      cant_por_caja: 24,
      cant_por_pack: ''
    });
    setShowProductModal(false);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleUpdateProduct = async () => {
  if (!newProductForm.nombre || !editingProduct) return;
  setLoading(true);
  try {
    const {
      error: updErr
    } = await supabase.from('productos').update({
      nombre: newProductForm.nombre,
      categoria: newProductForm.categoria,
      tipo: newProductForm.tipo,
      proveedor_id: newProductForm.proveedor_id ? parseInt(newProductForm.proveedor_id) : null,
      unidad_medida: newProductForm.unidad_medida,
      cant_por_caja: newProductForm.cant_por_caja ? parseInt(newProductForm.cant_por_caja) : 24,
      cant_por_pack: newProductForm.cant_por_pack ? parseInt(newProductForm.cant_por_pack) : null
    }).eq('id', editingProduct.id);
    if (updErr) throw updErr;
    showToast('Producto actualizado exitosamente.');
    setNewProductForm({
      nombre: '',
      categoria: 'helados',
      tipo: 'vasqueta_5_6k',
      proveedor_id: '',
      unidad_medida: 'unidad',
      cant_por_caja: 24,
      cant_por_pack: ''
    });
    setEditingProduct(null);
    setShowProductModal(false);
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleProductFormSubmit = e => {
  e.preventDefault();
  if (editingProduct) {
    handleUpdateProduct();
  } else {
    handleNewProductSubmit(e);
  }
};
const startEditingProduct = p => {
  setEditingProduct(p);
  setNewProductForm({
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '',
    unidad_medida: p.unidad_medida || 'unidad',
    cant_por_caja: p.cant_por_caja !== undefined && p.cant_por_caja !== null ? p.cant_por_caja : 24,
    cant_por_pack: p.cant_por_pack !== undefined && p.cant_por_pack !== null ? String(p.cant_por_pack) : ''
  });
  setShowProductModal(true);
};
const cancelEditingProduct = () => {
  setEditingProduct(null);
  setNewProductForm({
    nombre: '',
    categoria: 'helados',
    tipo: 'vasqueta_5_6k',
    proveedor_id: '',
    unidad_medida: 'unidad',
    cant_por_caja: 24,
    cant_por_pack: ''
  });
  setShowProductModal(false);
};
const handleToggleProductActive = async (prodId, currentActive) => {
  setLoading(true);
  try {
    const nextActive = currentActive === 1 ? 0 : 1;
    const {
      error: updErr
    } = await supabase.from('productos').update({
      activo: nextActive
    }).eq('id', prodId);
    if (updErr) throw updErr;
    showToast(nextActive === 1 ? 'Producto reactivado.' : 'Producto desactivado / eliminado.');
    if (editingProduct && editingProduct.id === prodId) {
      cancelEditingProduct();
    }
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleBranchCreateOtrosProduct = async e => {
  e.preventDefault();
  if (!branchOtrosForm.nombre) return;
  setLoading(true);
  try {
    const {
      data: newProd,
      error: insErr
    } = await supabase.from('productos').insert({
      nombre: branchOtrosForm.nombre,
      categoria: 'otros',
      tipo: branchOtrosForm.tipo
    }).select('id').single();
    if (insErr) throw insErr;
    const newProductId = newProd.id;
    const {
      data: branches,
      error: bErr
    } = await supabase.from('sucursales').select('id');
    if (bErr) throw bErr;
    const stockInserts = (branches || []).map(b => ({
      sucursal_id: b.id,
      producto_id: newProductId,
      cantidad: 0
    }));
    const {
      error: sErr
    } = await supabase.from('stock_sucursales').insert(stockInserts);
    if (sErr) throw sErr;
    showToast('Producto personalizado creado en Otros.');
    setBranchOtrosForm({
      nombre: '',
      tipo: 'packaging'
    });
    await fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const getBadgeClass = state => {
  return `badge badge-${state}`;
};
const translateState = state => {
  const trans = {
    solicitado: 'Solicitado',
    preparado: 'Preparado',
    en_transito: 'En viaje',
    entregado: 'Entregado OK',
    con_discrepancia: 'Diferencias'
  };
  return trans[state] || state;
};
const getMaintenanceOptionsForMachine = maquinaId => {
  const maquina = maquinas.find(m => m.id === parseInt(maquinaId));
  if (!maquina) return [{
    value: 'otro',
    label: 'Otro'
  }];
  switch (maquina.tipo_equipo) {
    case 'maquina_helado':
      return [{
        value: 'limpieza_circuito',
        label: 'Limpieza de circuito'
      }, {
        value: 'revision_tecnica',
        label: 'Revisión técnica por mal funcionamiento'
      }, {
        value: 'otro',
        label: 'Otro'
      }];
    case 'frio_abatidor_heladera_camara':
      return [{
        value: 'limpieza_motor',
        label: 'Mantenimiento / Limpieza del motor'
      }, {
        value: 'revision_tecnica',
        label: 'Revisión técnica por mal funcionamiento'
      }, {
        value: 'otro',
        label: 'Otro'
      }];
    case 'aire_acondicionado':
      return [{
        value: 'limpieza_filtros',
        label: 'Limpieza de filtros'
      }, {
        value: 'revision_tecnica',
        label: 'Revisión técnica por mal funcionamiento'
      }, {
        value: 'otro',
        label: 'Otro'
      }];
    case 'licuadora_horno_batidora_micro':
      return [{
        value: 'revision_tecnica',
        label: 'Revisión técnica por mal funcionamiento'
      }, {
        value: 'otro',
        label: 'Otro'
      }];
    default:
      return [{
        value: 'limpieza_circuito',
        label: 'Limpieza de circuito'
      }, {
        value: 'limpieza_motor',
        label: 'Mantenimiento / Limpieza del motor'
      }, {
        value: 'limpieza_filtros',
        label: 'Limpieza de filtros'
      }, {
        value: 'revision_tecnica',
        label: 'Revisión técnica por mal funcionamiento'
      }, {
        value: 'otro',
        label: 'Otro'
      }];
  }
};
const getEquipoIcon = type => {
  switch (type) {
    case 'licuadora_horno_batidora_micro':
      return '🌪️';
    case 'maquina_helado':
      return '🍦';
    case 'frio_abatidor_heladera_camara':
      return '❄️';
    case 'aire_acondicionado':
      return '💨';
    default:
      return '⚙️';
  }
};
const getEquipoTypeLabel = type => {
  const labels = {
    licuadora_horno_batidora_micro: 'Licuadora / Horno / Batidora / Microondas',
    maquina_helado: 'Máquina de Helado',
    frio_abatidor_heladera_camara: 'Abatidor / Heladera / Cámara (Frío)',
    aire_acondicionado: 'Aire Acondicionado',
    otro: 'Otro Equipo'
  };
  return labels[type] || type;
};
const getMaintenanceTypeLabel = type => {
  const labels = {
    limpieza_circuito: 'Limpieza de circuito',
    limpieza_motor: 'Mantenimiento / Limpieza del motor',
    limpieza_filtros: 'Limpieza de filtros',
    revision_tecnica: 'Revisión técnica por mal funcionamiento',
    otro: 'Otro Mantenimiento'
  };
  return labels[type] || type;
};
const getMaintenanceAlerts = () => {
  const todayStr = getLocalDateString();
  const today = new Date(todayStr);
  const alerts = [];
  const latestScheduled = {};
  mantenimientos.forEach(m => {
    if (!m.proxima_fecha) return;
    const key = `${m.maquina_id}-${m.tipo}`;
    const current = latestScheduled[key];
    if (!current || new Date(m.fecha) > new Date(current.fecha)) {
      latestScheduled[key] = m;
    }
  });
  Object.values(latestScheduled).forEach(m => {
    const proxDate = new Date(m.proxima_fecha);
    const diffTime = proxDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const maquina = maquinas.find(maq => maq.id === m.maquina_id);
    if (!maquina || maquina.estado === 'de_baja') return; 
    if (diffDays < 0) {
      alerts.push({
        id: m.id,
        maquina,
        tipo_mantenimiento: m.tipo,
        proxima_fecha: m.proxima_fecha,
        dias: Math.abs(diffDays),
        estado: 'vencido'
      });
    } else if (diffDays <= 30) {
      alerts.push({
        id: m.id,
        maquina,
        tipo_mantenimiento: m.tipo,
        proxima_fecha: m.proxima_fecha,
        dias: diffDays,
        estado: 'proximo'
      });
    }
  });
  return alerts.sort((a, b) => new Date(a.proxima_fecha) - new Date(b.proxima_fecha));
};
const handleSaveMaquina = async e => {
  e.preventDefault();
  if (!maquinaForm.nombre || !maquinaForm.tipo_equipo || !maquinaForm.sucursal_id) {
    showToast('Por favor, completa los campos requeridos.', 'error');
    return;
  }
  setLoading(true);
  try {
    const dataToSave = {
      nombre: maquinaForm.nombre,
      tipo_equipo: maquinaForm.tipo_equipo,
      sucursal_id: parseInt(maquinaForm.sucursal_id),
      marca: maquinaForm.marca || null,
      modelo: maquinaForm.modelo || null,
      numero_serie: maquinaForm.numero_serie || null,
      fecha_adquisicion: maquinaForm.fecha_adquisicion || null,
      estado: maquinaForm.estado,
      descripcion: maquinaForm.descripcion || null
    };
    if (editingMaquina) {
      const {
        error
      } = await supabase.from('maquinas').update(dataToSave).eq('id', editingMaquina.id);
      if (error) throw error;
      showToast('Máquina actualizada con éxito.');
    } else {
      const {
        error
      } = await supabase.from('maquinas').insert(dataToSave);
      if (error) throw error;
      showToast('Máquina creada con éxito.');
    }
    setShowMaquinaModal(false);
    setEditingMaquina(null);
    setMaquinaForm({
      nombre: '',
      tipo_equipo: 'licuadora_horno_batidora_micro',
      sucursal_id: '',
      marca: '',
      modelo: '',
      numero_serie: '',
      fecha_adquisicion: '',
      estado: 'activo',
      descripcion: ''
    });
    fetchMaquinasYMantenimientos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleSaveStockAdmin = async e => {
  e.preventDefault();
  setLoading(true);
  try {
    const {
      producto_id,
      sucursal_id,
      es_evento,
      cantidad
    } = editStockForm;
    const numCant = parseInt(cantidad);
    if (isNaN(numCant) || numCant < 0) throw new Error("La cantidad debe ser un número válido mayor o igual a cero.");
    const {
      data: existing,
      error: eErr
    } = await supabase.from('stock_sucursales').select('*').eq('producto_id', producto_id).eq('sucursal_id', sucursal_id).eq('es_evento', es_evento);
    if (eErr) throw eErr;
    if (existing && existing.length > 0) {
      const {
        error: updErr
      } = await supabase.from('stock_sucursales').update({
        cantidad: numCant
      }).eq('producto_id', producto_id).eq('sucursal_id', sucursal_id).eq('es_evento', es_evento);
      if (updErr) throw updErr;
    } else {
      const {
        error: insErr
      } = await supabase.from('stock_sucursales').insert({
        producto_id,
        sucursal_id,
        es_evento,
        cantidad: numCant,
        actualizado_por: user.id
      });
      if (insErr) throw insErr;
    }
    showToast("Stock actualizado correctamente.", "success");
    setShowEditStockModal(false);
    fetchData();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error al actualizar stock", "error");
  } finally {
    setLoading(false);
  }
};
const handleEditMaquina = maq => {
  setEditingMaquina(maq);
  setMaquinaForm({
    nombre: maq.nombre || '',
    tipo_equipo: maq.tipo_equipo || 'licuadora_horno_batidora_micro',
    sucursal_id: maq.sucursal_id || '',
    marca: maq.marca || '',
    modelo: maq.modelo || '',
    numero_serie: maq.numero_serie || '',
    fecha_adquisicion: maq.fecha_adquisicion || '',
    estado: maq.estado || 'activo',
    descripcion: maq.descripcion || ''
  });
  setShowMaquinaModal(true);
};
const handleDeleteMaquina = async id => {
  if (!window.confirm('¿Estás seguro de que deseas eliminar esta máquina? Se borrará también todo su historial de mantenimiento.')) return;
  setLoading(true);
  try {
    const {
      error
    } = await supabase.from('maquinas').delete().eq('id', id);
    if (error) throw error;
    showToast('Máquina eliminada con éxito.');
    fetchMaquinasYMantenimientos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleSaveMaintenance = async e => {
  e.preventDefault();
  if (!maintenanceForm.maquina_id || !maintenanceForm.fecha || !maintenanceForm.descripcion) {
    showToast('Por favor, completa los campos requeridos.', 'error');
    return;
  }
  setLoading(true);
  try {
    const dataToSave = {
      maquina_id: parseInt(maintenanceForm.maquina_id),
      fecha: maintenanceForm.fecha,
      tipo: maintenanceForm.tipo,
      descripcion: maintenanceForm.descripcion,
      cambio_repuesto: maintenanceForm.cambio_repuesto,
      repuesto_detalle: maintenanceForm.cambio_repuesto ? maintenanceForm.repuesto_detalle : null,
      costo: maintenanceForm.costo ? parseFloat(maintenanceForm.costo) : 0,
      realizado_por: maintenanceForm.realizado_por || null,
      proxima_fecha: maintenanceForm.proxima_fecha || null
    };
    if (editingMaintenance) {
      const {
        error
      } = await supabase.from('mantenimientos').update(dataToSave).eq('id', editingMaintenance.id);
      if (error) throw error;
      showToast('Registro de mantenimiento actualizado.');
    } else {
      const {
        error
      } = await supabase.from('mantenimientos').insert(dataToSave);
      if (error) throw error;
      showToast('Registro de mantenimiento creado.');
    }
    setShowMaintenanceModal(false);
    setEditingMaintenance(null);
    setMaintenanceForm({
      maquina_id: '',
      fecha: getLocalDateString(),
      tipo: 'revision_tecnica',
      descripcion: '',
      cambio_repuesto: false,
      repuesto_detalle: '',
      costo: '',
      realizado_por: '',
      proxima_fecha: ''
    });
    fetchMaquinasYMantenimientos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
const handleEditMaintenance = mant => {
  setEditingMaintenance(mant);
  setMaintenanceForm({
    maquina_id: mant.maquina_id || '',
    fecha: mant.fecha || getLocalDateString(),
    tipo: mant.tipo || 'revision_tecnica',
    descripcion: mant.descripcion || '',
    cambio_repuesto: mant.cambio_repuesto || false,
    repuesto_detalle: mant.repuesto_detalle || '',
    costo: mant.costo || '',
    realizado_por: mant.realizado_por || '',
    proxima_fecha: mant.proxima_fecha || ''
  });
  setShowMaintenanceModal(true);
};
const handleDeleteMaintenance = async id => {
  if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de mantenimiento?')) return;
  setLoading(true);
  try {
    const {
      error
    } = await supabase.from('mantenimientos').delete().eq('id', id);
    if (error) throw error;
    showToast('Registro de mantenimiento eliminado.');
    fetchMaquinasYMantenimientos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
};
  const contextValue = {
    categories,
    getLocalDateString,
    formatQuantity,
    formatQuantityShort,
    user,
    setUser,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    toast,
    setToast,
    activeTab,
    setActiveTab,
    productos,
    setProductos,
    sucursales,
    setSucursales,
    stockData,
    setStockData,
    adminStockMatriz,
    setAdminStockMatriz,
    flujoPedidosStats,
    setFlujoPedidosStats,
    orders,
    setOrders,
    dashboardStats,
    setDashboardStats,
    auditoriaData,
    setAuditoriaData,
    auditoriaFilterSucursal,
    setAuditoriaFilterSucursal,
    auditoriaFilterDays,
    setAuditoriaFilterDays,
    retiroItems,
    setRetiroItems,
    loading,
    setLoading,
    selectedPedido,
    setSelectedPedido,
    prodForm,
    setProdForm,
    prodWeights,
    setProdWeights,
    recentLotes,
    setRecentLotes,
    stockGroupFilter,
    setStockGroupFilter,
    iceCreamFormatFilter,
    setIceCreamFormatFilter,
    orderSubTab,
    setOrderSubTab,
    adminStockTab,
    setAdminStockTab,
    orderSearchQuery,
    setOrderSearchQuery,
    branchOtrosForm,
    setBranchOtrosForm,
    adminHistForm,
    setAdminHistForm,
    adminHistWeights,
    setAdminHistWeights,
    adminHistDefaultWeight,
    setAdminHistDefaultWeight,
    histCargaMode,
    setHistCargaMode,
    histBulkCategory,
    setHistBulkCategory,
    orderItems,
    setOrderItems,
    suggestions,
    setSuggestions,
    orderIsEvent,
    setOrderIsEvent,
    pendingItems,
    setPendingItems,
    consumoForm,
    setConsumoForm,
    loadItems,
    setLoadItems,
    transpCargaForm,
    setTranspCargaForm,
    transitLoss,
    setTransitLoss,
    showLossModal,
    setShowLossModal,
    receiveItems,
    setReceiveItems,
    receiveReasons,
    setReceiveReasons,
    newProductForm,
    setNewProductForm,
    showEventStock,
    setShowEventStock,
    allProducts,
    setAllProducts,
    editingProduct,
    setEditingProduct,
    showProductModal,
    setShowProductModal,
    editingProv,
    setEditingProv,
    showProvModal,
    setShowProvModal,
    provForm,
    setProvForm,
    catalogSearch,
    setCatalogSearch,
    catalogCategory,
    setCatalogCategory,
    catalogSupplier,
    setCatalogSupplier,
    catalogFormat,
    setCatalogFormat,
    catalogStatus,
    setCatalogStatus,
    adminStockSearch,
    setAdminStockSearch,
    prodReqSearch,
    setProdReqSearch,
    prodFormSearch,
    setProdFormSearch,
    factoryStockSearch,
    setFactoryStockSearch,
    branchStockSearch,
    setBranchStockSearch,
    adminFlujoSearch,
    setAdminFlujoSearch,
    adminDiscrepanciaSearch,
    setAdminDiscrepanciaSearch,
    adminHistSearch,
    setAdminHistSearch,
    adminMaquinaSearch,
    setAdminMaquinaSearch,
    adminMantenimientoSearch,
    setAdminMantenimientoSearch,
    sucursalConsumoSearch,
    setSucursalConsumoSearch,
    sucursalOrderSearch,
    setSucursalOrderSearch,
    driverOrderSearch,
    setDriverOrderSearch,
    driverRouteSearch,
    setDriverRouteSearch,
    driverDepotSearch,
    setDriverDepotSearch,
    heladeroEventSearch,
    setHeladeroEventSearch,
    adminOrderItems,
    setAdminOrderItems,
    adminOrderDestination,
    setAdminOrderDestination,
    adminOrderIsEvent,
    setAdminOrderIsEvent,
    adminOrderSolicitFabrication,
    setAdminOrderSolicitFabrication,
    prepareStockSource,
    setPrepareStockSource,
    adminOrderSubTab,
    setAdminOrderSubTab,
    adminOrderSearch,
    setAdminOrderSearch,
    showEventStockDepot,
    setShowEventStockDepot,
    showEditStockModal,
    setShowEditStockModal,
    editStockForm,
    setEditStockForm,
    editStockItemDetails,
    setEditStockItemDetails,
    proveedores,
    discrepancias,
    productionOrders,
    setProductionOrders,
    setProveedores,
    showSupplierForm,
    setShowSupplierForm,
    newSupplierName,
    setNewSupplierName,
    adminStockSupplierFilter,
    setAdminStockSupplierFilter,
    adminOrderSupplierFilter,
    setAdminOrderSupplierFilter,
    maquinas,
    setMaquinas,
    mantenimientos,
    setMantenimientos,
    maintenanceSubTab,
    setMaintenanceSubTab,
    selectedMaquinaFilter,
    setSelectedMaquinaFilter,
    selectedSucursalFilter,
    setSelectedSucursalFilter,
    selectedTipoEquipoFilter,
    setSelectedTipoEquipoFilter,
    showMaquinaModal,
    setShowMaquinaModal,
    editingMaquina,
    setEditingMaquina,
    maquinaForm,
    setMaquinaForm,
    showMaintenanceModal,
    setShowMaintenanceModal,
    editingMaintenance,
    setEditingMaintenance,
    maintenanceForm,
    setMaintenanceForm,
    isCategoryVisibleToRole,
    getTiposPorCategoria,
    getTareByTipo,
    flavorGroups,
    getFlavorName,
    formatTipo,
    isProductVisibleToRole,
    getProductOptionLabel,
    getFlavorGroup,
    getProductNetWeight,
    getGroupedStock,
    handleCategoriaChange,
    showToast,
    handleLogin,
    handleLogout,
    fetchData,
    fetchMaquinasYMantenimientos,
    fetchAuditoriaData,
    handleDownloadAuditoriaCSV,
    handleProductionSubmit,
    handleAdminHistSubmit,
    handleTranspCargaSubmit,
    handleProvSubmit,
    handleProvDelete,
    handleDownloadHistTemplate,
    handleUploadHistTemplate,
    handleConsumoSubmit,
    handleCreateOrder,
    handleAdminCreateOrder,
    applyAllSuggestions,
    handleRetiroInternoSubmit,
    viewOrderDetail,
    handlePrepareOrder,
    handleConfirmLoad,
    handleReportLoss,
    handleMarkDelivered,
    handleConfirmReceive,
    handleCreateSupplier,
    handleNewProductSubmit,
    handleUpdateProduct,
    handleProductFormSubmit,
    startEditingProduct,
    cancelEditingProduct,
    handleToggleProductActive,
    handleBranchCreateOtrosProduct,
    getBadgeClass,
    translateState,
    getMaintenanceOptionsForMachine,
    getEquipoIcon,
    getEquipoTypeLabel,
    getMaintenanceTypeLabel,
    getMaintenanceAlerts,
    handleSaveMaquina,
    handleSaveStockAdmin,
    handleEditMaquina,
    handleDeleteMaquina,
    handleSaveMaintenance,
    handleEditMaintenance,
    handleDeleteMaintenance
  };
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
