import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
const categories = [
  { id: 'helados', name: 'Helados' },
  { id: 'pasteleria_helada', name: 'Pastelería Helada' },
  { id: 'pasteleria', name: 'Pastelería Clásica' },
  { id: 'viennoiserie', name: 'Viennoiserie' },
  { id: 'termicos', name: 'Térmicos' },
  { id: 'otros', name: 'Otros' }
];

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
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
  }
  return `${cantidad} u`;
};

const formatQuantityShort = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (cantidad === 0) return '0';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso') {
    const kg = parseFloat(cantidad);
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
  }
  return `${cantidad} u`;
};

const UnitCalculatorInput = ({ value, onChange, product, placeholder = "Cantidad", disabled = false, min = 0 }) => {
  const isWeight = product?.unidad_medida === 'peso';

  if (isWeight) {
    const displayVal = value !== undefined && value !== null && value !== '' ? parseFloat(value) : '';
    return (
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
        <input
          type="number"
          step="0.001"
          className="form-control"
          style={{ flex: 1 }}
          value={displayVal}
          onChange={e => {
            const val = e.target.value;
            onChange(val === '' ? '' : Math.max(min, parseFloat(val)));
          }}
          placeholder={`${placeholder} (kg)`}
          disabled={disabled}
          min={min}
        />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>kg</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
      <input
        type="number"
        step="1"
        className="form-control"
        style={{ flex: 1 }}
        value={value === undefined || value === null ? '' : value}
        onChange={e => {
          const val = e.target.value;
          onChange(val === '' ? '' : Math.max(min, parseInt(val) || 0));
        }}
        placeholder={`${placeholder} (u)`}
        disabled={disabled}
        min={min}
      />
      <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>u</span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('biscui_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('biscui_tab');
    if (savedTab) return savedTab;
    
    const saved = localStorage.getItem('biscui_user');
    if (saved) {
      const parsedUser = JSON.parse(saved);
      if (parsedUser.rol === 'admin') return 'matrix';
      if (parsedUser.rol === 'heladero' || parsedUser.rol === 'pastelero' || parsedUser.rol === 'pastelero_helado') return 'produccion';
      if (parsedUser.rol === 'transportista') return 'pedidos';
      return 'pedido_nuevo';
    }
    return '';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('biscui_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('biscui_user');
      localStorage.removeItem('biscui_tab');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('biscui_tab', activeTab);
    }
  }, [activeTab]);

  // Data states
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Auditoria Consumo & Retiro Interno
  const [auditoriaData, setAuditoriaData] = useState([]);
  const [auditoriaFilterSucursal, setAuditoriaFilterSucursal] = useState('');
  const [auditoriaFilterDays, setAuditoriaFilterDays] = useState('7');
  const [retiroItems, setRetiroItems] = useState({});
  // Action/Form states
  const [loading, setLoading] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);

  // Production form state
  const [prodForm, setProdForm] = useState({ producto_id: '', cantidad: '', fecha: getLocalDateString(), es_evento: false });
  const [prodWeights, setProdWeights] = useState([]);
  const [recentLotes, setRecentLotes] = useState([]);
  const [stockGroupFilter, setStockGroupFilter] = useState('Todos');
  const [iceCreamFormatFilter, setIceCreamFormatFilter] = useState('Todos'); // 'Todos', 'Vasqueta', 'Balde'
  const [orderSubTab, setOrderSubTab] = useState('helados');
  const [adminStockTab, setAdminStockTab] = useState('helados');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [branchOtrosForm, setBranchOtrosForm] = useState({ nombre: '', tipo: 'packaging' });

  // Admin historic production form state
  const [adminHistForm, setAdminHistForm] = useState({ producto_id: '', cantidad: '', fecha: getLocalDateString(), es_evento: false });
  const [adminHistWeights, setAdminHistWeights] = useState([]);
  const [adminHistDefaultWeight, setAdminHistDefaultWeight] = useState('');
  const [histCargaMode, setHistCargaMode] = useState('individual'); // 'individual' or 'masiva'
  const [histBulkCategory, setHistBulkCategory] = useState('helados');

  // Order creation form state
  const [orderItems, setOrderItems] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [orderIsEvent, setOrderIsEvent] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);

  // Consumption form state
  const [consumoForm, setConsumoForm] = useState({ producto_id: '', cantidad: '', es_evento: false });

  // Driver load edit state
  const [loadItems, setLoadItems] = useState({});
  const [transpCargaForm, setTranspCargaForm] = useState({ producto_id: '', proveedor_id: '', cantidad: '', fecha: getLocalDateString() });
  const [transitLoss, setTransitLoss] = useState({ producto_id: '', cantidad_perdida: '', motivo: '' });
  const [showLossModal, setShowLossModal] = useState(false);

  // Branch receive check state
  const [receiveItems, setReceiveItems] = useState({});
  const [receiveReasons, setReceiveReasons] = useState({});

  // Admin new product form
  const [newProductForm, setNewProductForm] = useState({
    nombre: '',
    categoria: 'helados',
    tipo: 'vasqueta_5_6k',
    proveedor_id: '',
    unidad_medida: 'unidad',
    cant_por_caja: 24,
    cant_por_pack: ''
  });

  // Event stock toggle state
  const [showEventStock, setShowEventStock] = useState(false);

  // States for CRUD products
  const [allProducts, setAllProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // States for CRUD Proveedores
  const [editingProv, setEditingProv] = useState(null);
  const [showProvModal, setShowProvModal] = useState(false);
  const [provForm, setProvForm] = useState({ nombre: '', cuit: '', telefono: '', direccion: '', email: '' });

  // States for catalog filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Todos');
  const [catalogSupplier, setCatalogSupplier] = useState('');
  const [catalogFormat, setCatalogFormat] = useState('Todos');
  const [catalogStatus, setCatalogStatus] = useState('Todos');

  // Search states for different views
  const [adminStockSearch, setAdminStockSearch] = useState('');
  const [prodReqSearch, setProdReqSearch] = useState('');
  const [prodFormSearch, setProdFormSearch] = useState('');
  const [factoryStockSearch, setFactoryStockSearch] = useState('');
  const [branchStockSearch, setBranchStockSearch] = useState('');

  // Additional search states for other views
  const [adminFlujoSearch, setAdminFlujoSearch] = useState('');
  const [adminDiscrepanciaSearch, setAdminDiscrepanciaSearch] = useState('');
  const [adminHistSearch, setAdminHistSearch] = useState('');
  const [adminMaquinaSearch, setAdminMaquinaSearch] = useState('');
  const [adminMantenimientoSearch, setAdminMantenimientoSearch] = useState('');
  const [sucursalConsumoSearch, setSucursalConsumoSearch] = useState('');
  const [sucursalOrderSearch, setSucursalOrderSearch] = useState('');
  const [driverOrderSearch, setDriverOrderSearch] = useState('');
  const [driverRouteSearch, setDriverRouteSearch] = useState('');
  const [driverDepotSearch, setDriverDepotSearch] = useState('');
  const [heladeroEventSearch, setHeladeroEventSearch] = useState('');


  // Admin order builder state
  const [adminOrderItems, setAdminOrderItems] = useState({});
  const [adminOrderDestination, setAdminOrderDestination] = useState('');
  const [adminOrderIsEvent, setAdminOrderIsEvent] = useState(false);
  const [adminOrderSolicitFabrication, setAdminOrderSolicitFabrication] = useState(false);
  const [prepareStockSource, setPrepareStockSource] = useState('evento');
  const [adminOrderSubTab, setAdminOrderSubTab] = useState('helados');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [showEventStockDepot, setShowEventStockDepot] = useState(false);

  // States for Edit Stock Admin
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [editStockForm, setEditStockForm] = useState({ producto_id: '', sucursal_id: '', es_evento: false, cantidad: '' });
  const [editStockItemDetails, setEditStockItemDetails] = useState({ producto_nombre: '', sucursal_nombre: '', tipo: '' });

  // Suppliers state
  const [proveedores, setProveedores] = useState([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [adminStockSupplierFilter, setAdminStockSupplierFilter] = useState('');
  const [adminOrderSupplierFilter, setAdminOrderSupplierFilter] = useState('');

  // Estados de Máquinas y Mantenimiento
  const [maquinas, setMaquinas] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [maintenanceSubTab, setMaintenanceSubTab] = useState('inventario');
  const [selectedMaquinaFilter, setSelectedMaquinaFilter] = useState('Todos');
  const [selectedSucursalFilter, setSelectedSucursalFilter] = useState('Todos');
  const [selectedTipoEquipoFilter, setSelectedTipoEquipoFilter] = useState('Todos');

  // Estados de Formulario de Máquinas
  const [showMaquinaModal, setShowMaquinaModal] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);
  const [maquinaForm, setMaquinaForm] = useState({
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

  // Estados de Formulario de Mantenimiento
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
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

  // Helper to check category visibility based on user role
  const isCategoryVisibleToRole = (category, role) => {
    if (role === 'heladero') return category === 'helados';
    if (role === 'pastelero_helado') return category === 'pasteleria_helada';
    if (role === 'pastelero') return category === 'pasteleria' || category === 'viennoiserie';
    return false;
  };

  const getTiposPorCategoria = (categoria) => {
    switch (categoria) {
      case 'helados':
        return [
          { value: 'vasqueta_5_6k', label: 'Vasqueta' },
          { value: 'balde_4k', label: 'Balde 5L' },
          { value: 'balde_8k', label: 'Balde 10L' }
        ];
      case 'pasteleria_helada':
        return [
          { value: 'cubanitos', label: 'Cubanitos' },
          { value: 'buche_oreo', label: 'Buche Oreo' },
          { value: 'buche_tiramisu', label: 'Buche Tiramisú' },
          { value: 'paleta', label: 'Paleta' },
          { value: 'mini_paleta', label: 'Mini Paleta' },
          { value: 'lingote', label: 'Lingote' },
          { value: 'mini_cake', label: 'Mini Cake' },
          { value: 'sanguche_miga', label: 'Sánguches de Miga' }
        ];
      case 'pasteleria':
        return [
          { value: 'lemon_pie', label: 'Lemon Pie' },
          { value: 'cheesecake', label: 'Cheesecake' },
          { value: 'mini_cheesecake', label: 'Mini Cheesecake' },
          { value: 'pirinea', label: 'Pirinea' },
          { value: 'mini_pirinea', label: 'Mini Pirinea' },
          { value: 'torta', label: 'Torta' },
          { value: 'alfajor', label: 'Alfajor' }
        ];
      case 'viennoiserie':
        return [
          { value: 'roll', label: 'Roll' },
          { value: 'croissant', label: 'Croissant' },
          { value: 'brownie', label: 'Brownie' },
          { value: 'viennoiserie_otra', label: 'Otro Viennoiserie' }
        ];
      case 'termicos':
        return [
          { value: 'vaso_1_bocha', label: 'Vaso 1 bocha' },
          { value: 'vaso_2_bochas', label: 'Vaso 2 bochas' },
          { value: 'termico_1_4', label: 'Térmico 1/4 kg' },
          { value: 'termico_1_2', label: 'Térmico 1/2 kg' },
          { value: 'termico_3_4', label: 'Térmico 3/4 kg' },
          { value: 'termico_1k', label: 'Térmico 1 kg' },
          { value: 'termico_buche', label: 'Térmico de Buche' }
        ];
      case 'otros':
        return [
          { value: 'packaging', label: 'Packaging' },
          { value: 'insumo', label: 'Insumo' }
        ];
      default:
        return [];
    }
  };

  const getTareByTipo = (tipo) => {
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



  const flavorGroups = {
    'Dulces de leche': ['Chocotorta', 'Dulce de Leche Biscui', 'Rogel', 'Granizado', 'Coco crunch'],
    'Chocolate': ['Chocolate con almendras', 'Marquise', 'Alfajor', 'Black', 'Patagonia', 'Blanco con maracuyá', 'Dubai'],
    'Cremas': ['Frutilla condensada', 'Coquitas', 'Mascarpone', 'Tiramisú', 'Lemon pie', 'Oreo', 'Menta granizada', 'Snickers', 'Caramel Macchiato', 'Tramontana', 'Cinnamon roll', 'Vainilla french', 'Oreo sin TACC', 'Granizado'],
    'Sin gluten': ['Oreo sin TACC (Sin Gluten)', 'Granizado (Sin Gluten)', 'Frutilla condensada (Sin Gluten)', 'Mascarpone (Sin Gluten)', 'Pistacho (Sin Gluten)', 'Banana split (Sin Gluten)', 'Sambayon (Sin Gluten)'],
    'Frutales al agua': ['Limonada', 'Frutilla citrica', 'Durazno y kiwi', 'Pasion frutal']
  };

  const getFlavorName = (fullName) => {
    return fullName
      .replace(/^Vasqueta /, '')
      .replace(/^Balde /, '')
      .replace(/ \(5-6kg\)$/, '')
      .replace(/ \(4kg\)$/, '')
      .replace(/ \(8kg\)$/, '')
      .replace(/ 5k$/, '')
      .replace(/ 10k$/, '')
      .replace(/ \(5k\)$/, '')
      .replace(/ \(10k\)$/, '')
      .replace(/ 5L$/i, '')
      .replace(/ 10L$/i, '')
      .replace(/ \(5L\)$/i, '')
      .replace(/ \(10L\)$/i);
  };

  const formatTipo = (tipo) => {
    if (tipo === 'vasqueta_5_6k') return 'Vasqueta';
    if (tipo === 'balde_4k') return 'Balde 5L';
    if (tipo === 'balde_8k') return 'Balde 10L';
    return tipo?.replace(/_/g, ' ');
  };

  const getProductOptionLabel = (p) => {
    const formatted = formatTipo(p.tipo);
    if (!formatted) return p.nombre;

    const normNombre = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normTipo = formatted.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Check if the name already contains the type, or vice versa
    if (normNombre.includes(normTipo) || normTipo.includes(normNombre)) {
      return p.nombre;
    }

    // Check if the name contains the first word of the type (e.g., "sanguche" in "sanguches de miga")
    const typeWords = normTipo.split(' ');
    if (typeWords.length > 0 && typeWords[0].length > 3) {
      const firstWordStem = typeWords[0].slice(0, 5);
      if (normNombre.includes(firstWordStem)) {
        return p.nombre;
      }
    }

    return `${p.nombre} (${formatted})`;
  };

  const getFlavorGroup = (fullName) => {
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
      case 'vasqueta_5_6k': return 5.5;
      case 'balde_4k': return 4.0;
      case 'balde_8k': return 8.0;
      default: return 0.0;
    }
  };

  const getGroupedStock = (forEvent = false) => {
    const factoryStock = stockData.filter(s => s.sucursal_id === 1 && s.categoria === 'helados' && (s.es_evento === forEvent));
    const grouped = {};
    factoryStock.forEach(s => {
      const flavor = getFlavorName(s.producto_nombre);
      const group = getFlavorGroup(s.producto_nombre);

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

      if (s.tipo === 'vasqueta_5_6k') {
        grouped[flavor].vasqueta_qty += s.cantidad;
        grouped[flavor].vasqueta_id = s.producto_id;
      } else if (s.tipo === 'balde_4k') {
        grouped[flavor].balde_4k_qty += s.cantidad;
        grouped[flavor].balde_4k_id = s.producto_id;
      } else if (s.tipo === 'balde_8k') {
        grouped[flavor].balde_8k_qty += s.cantidad;
        grouped[flavor].balde_8k_id = s.producto_id;
      }
    });

    return Object.values(grouped);
  };

  const handleCategoriaChange = (cat) => {
    const tipos = getTiposPorCategoria(cat);
    setNewProductForm({
      ...newProductForm,
      categoria: cat,
      tipo: tipos.length > 0 ? tipos[0].value : ''
    });
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First try to find by username (nombre)
      let { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          email,
          password,
          rol,
          sucursal_id,
          sucursales (
            nombre
          )
        `)
        .eq('nombre', usernameInput)
        .maybeSingle();

      // If not found by username, try to find by email
      if (!userData && !userError) {
        const { data: emailData, error: emailError } = await supabase
          .from('usuarios')
          .select(`
            id,
            nombre,
            email,
            password,
            rol,
            sucursal_id,
            sucursales (
              nombre
            )
          `)
          .eq('email', usernameInput)
          .maybeSingle();

        userData = emailData;
        userError = emailError;
      }

      if (userError || !userData || userData.password !== passwordInput) {
        throw new Error('Usuario o contraseña incorrectos.');
      }
      const sessionUser = {
        id: userData.id,
        nombre: userData.nombre,
        rol: userData.rol,
        sucursal_id: userData.sucursal_id,
        sucursal_nombre: userData.sucursales?.nombre
      };

      setUser(sessionUser);
      showToast(`¡Bienvenido, ${sessionUser.nombre}!`);

      // Set default tab based on role
      if (sessionUser.rol === 'admin') setActiveTab('matrix');
      else if (sessionUser.rol === 'heladero' || sessionUser.rol === 'pastelero' || sessionUser.rol === 'pastelero_helado') setActiveTab('produccion');
      else if (sessionUser.rol === 'transportista') setActiveTab('pedidos');
      else setActiveTab('pedido_nuevo');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setSelectedPedido(null);
    showToast('Sesión cerrada.');
  };


  // Fetch core data based on logged in user and tab
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch active products (with suppliers join, fallback if migration not run yet)
      let pData = [];
      let { data: pDataJoin, error: pErrJoin } = await supabase
        .from('productos')
        .select('*, proveedores(nombre)')
        .eq('activo', 1);
      
      if (pErrJoin) {
        const { data: pDataSimple, error: pErrSimple } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', 1);
        if (pErrSimple) throw pErrSimple;
        pData = pDataSimple || [];
      } else {
        pData = (pDataJoin || []).map(p => ({
          ...p,
          proveedor_nombre: p.proveedores?.nombre
        }));
      }
      setProductos(pData);

      // Fetch branches
      const { data: sData, error: sErr } = await supabase
        .from('sucursales')
        .select('*');
      if (sErr) throw sErr;
      setSucursales(sData || []);

      // Fetch suppliers
      const { data: provData, error: provErr } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre');
      if (!provErr) {
        setProveedores(provData || []);
      }

      // Fetch all products (active and inactive) for admin catalog management
      if (user.rol === 'admin') {
        const { data: allPData, error: allPErr } = await supabase
          .from('productos')
          .select('*, proveedores(nombre)')
          .order('nombre');
        if (!allPErr) {
          const mappedAllP = (allPData || []).map(p => ({
            ...p,
            proveedor_nombre: p.proveedores?.nombre
          }));
          setAllProducts(mappedAllP);
        }
      }

      // Fetch recent production batches (lotes)
      const { data: lotesRaw, error: lotesErr } = await supabase
        .from('lotes_produccion')
        .select(`
          *,
          productos ( nombre, tipo, categoria )
        `)
        .order('id', { ascending: false })
        .limit(20);
      if (!lotesErr) {
        setRecentLotes(lotesRaw || []);
      }

      // Fetch stock (filtered by sucursal if sucursal employee, with supplier join fallback)
      let rawStock = [];
      let stockQuery = supabase
        .from('stock_sucursales')
        .select(`
          sucursal_id,
          sucursales ( nombre ),
          producto_id,
          productos ( nombre, tipo, categoria, activo, proveedor_id, proveedores(nombre) ),
          cantidad,
          es_evento
        `);
      if (user.rol === 'sucursal') {
        stockQuery = stockQuery.eq('sucursal_id', user.sucursal_id);
      }
      let { data: rawStockJoin, error: stockErrJoin } = await stockQuery;

      if (stockErrJoin) {
        let stockQuerySimple = supabase
          .from('stock_sucursales')
          .select(`
            sucursal_id,
            sucursales ( nombre ),
            producto_id,
            productos ( nombre, tipo, categoria, activo, proveedor_id ),
            cantidad,
            es_evento
          `);
        if (user.rol === 'sucursal') {
          stockQuerySimple = stockQuerySimple.eq('sucursal_id', user.sucursal_id);
        }
        const { data: rawStockSimple, error: stockErrSimple } = await stockQuerySimple;
        if (stockErrSimple) throw stockErrSimple;
        rawStock = rawStockSimple || [];
      } else {
        rawStock = rawStockJoin || [];
      }

      const stockD = rawStock
        .filter(s => s.productos && s.productos.activo === 1)
        .map(s => ({
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

      // Fetch orders matching role
      let ordersQuery = supabase
        .from('pedidos')
        .select(`
          *,
          s_orig:sucursal_origen_id ( nombre ),
          s_dest:sucursal_destino_id ( nombre ),
          u_crea:creado_por_id ( nombre ),
          u_prep:preparado_por_id ( nombre ),
          u_trans:transportista_id ( nombre ),
          u_recib:recibido_por_id ( nombre )
        `);

      if (user.rol === 'sucursal' && user.sucursal_id) {
        ordersQuery = ordersQuery.eq('sucursal_destino_id', user.sucursal_id);
      } else if (user.rol === 'heladero' || user.rol === 'pastelero' || user.rol === 'pastelero_helado') {
        ordersQuery = ordersQuery.in('estado', ['solicitado', 'preparado']);
      } else if (user.rol === 'transportista') {
        ordersQuery = ordersQuery.in('estado', ['solicitado', 'preparado', 'en_transito', 'entregado']).neq('sucursal_destino_id', 4);
      }

      const { data: rawOrders, error: ordersErr } = await ordersQuery.order('id', { ascending: false });
      if (ordersErr) throw ordersErr;

      const ordersD = (rawOrders || []).map(o => ({
        ...o,
        origen_nombre: o.s_orig?.nombre,
        destino_nombre: o.s_dest?.nombre,
        creado_por_nombre: o.u_crea?.nombre,
        preparado_por_nombre: o.u_prep?.nombre,
        transportista_nombre: o.u_trans?.nombre,
        recibido_por_nombre: o.u_recib?.nombre
      }));
      setOrders(ordersD);

      // Fetch admin stats if applicable
      if (user.rol === 'admin') {
        // 1. Stock
        const { data: rawAllStock, error: allStockErr } = await supabase
          .from('stock_sucursales')
          .select(`
            sucursal_id,
            sucursales ( nombre ),
            producto_id,
            productos ( nombre, tipo, categoria, activo ),
            cantidad,
            es_evento
          `);
        if (allStockErr) throw allStockErr;
        const stockAll = (rawAllStock || [])
          .filter(s => s.productos && s.productos.activo === 1)
          .map(s => ({
            sucursal_id: s.sucursal_id,
            sucursal_nombre: s.sucursales?.nombre,
            producto_id: s.producto_id,
            producto_nombre: s.productos?.nombre,
            tipo: s.productos?.tipo,
            categoria: s.productos?.categoria,
            cantidad: s.cantidad,
            es_evento: s.es_evento
          }));

        // 2. Active orders count by status
        const { data: allOrders, error: allOrdersErr } = await supabase
          .from('pedidos')
          .select('estado');
        if (allOrdersErr) throw allOrdersErr;
        const counts = {};
        (allOrders || []).forEach(o => {
          counts[o.estado] = (counts[o.estado] || 0) + 1;
        });
        const activeOrders = Object.entries(counts).map(([estado, count]) => ({ estado, count }));

        // 3. Recent discrepancies
        const { data: rawDiscrepancies, error: discErr } = await supabase
          .from('discrepancias')
          .select(`
            *,
            productos ( nombre ),
            pedidos (
              sucursal_destino_id,
              s_dest:sucursal_destino_id ( nombre )
            ),
            usuarios ( nombre )
          `)
          .order('fecha_reporte', { ascending: false })
          .limit(10);
        if (discErr) throw discErr;
        const discrepancies = (rawDiscrepancies || []).map(d => ({
          ...d,
          producto_nombre: d.productos?.nombre,
          sucursal_nombre: d.pedidos?.s_dest?.nombre,
          reportado_por_nombre: d.usuarios?.nombre
        }));

        // 4. Production needed (demand vs factory stock)
        const { data: rawDetails, error: detErr } = await supabase
          .from('pedido_detalles')
          .select(`
            producto_id,
            cantidad_solicitada,
            cantidad_preparada,
            productos ( nombre, tipo, categoria ),
            pedidos!inner ( estado )
          `)
          .eq('pedidos.estado', 'solicitado');
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
          groupedNeeded[prodId].cantidad_pendiente += (d.cantidad_solicitada - d.cantidad_preparada);
        });

        const stockFabrica = stockAll.filter(s => s.sucursal_id === 1 && !s.es_evento);
        const stockFabMap = {};
        stockFabrica.forEach(s => stockFabMap[s.producto_id] = s.cantidad);

        const productionNeeded = Object.values(groupedNeeded).map(p => ({
          ...p,
          stock_fabrica: stockFabMap[p.producto_id] || 0
        })).filter(p => p.cantidad_pendiente > p.stock_fabrica);

        setDashboardStats({
          stock: stockAll,
          activeOrders,
          discrepancies,
          productionNeeded
        });
      }

      // Fetch suggestions if in sucursal
      if (user.rol === 'sucursal' && activeTab === 'pedido_nuevo') {
        const { data: pendsRaw, error: pendsErr } = await supabase
          .from('items_pendientes')
          .select(`
            producto_id,
            cantidad,
            productos ( nombre, tipo, categoria )
          `)
          .eq('sucursal_id', user.sucursal_id)
          .eq('es_evento', orderIsEvent);
        if (pendsErr) throw pendsErr;

        const pendsMapped = (pendsRaw || []).map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          nombre: p.productos?.nombre,
          tipo: p.productos?.tipo,
          categoria: p.productos?.categoria
        }));
        setPendingItems(pendsMapped);

        const { data: activeProds, error: apErr } = await supabase
          .from('productos')
          .select('id, nombre, tipo, categoria, unidad_medida, cant_por_caja, cant_por_pack')
          .eq('activo', 1);
        if (apErr) throw apErr;

        const { data: localSt, error: lsErr } = await supabase
          .from('stock_sucursales')
          .select('producto_id, cantidad')
          .eq('sucursal_id', user.sucursal_id)
          .eq('es_evento', orderIsEvent);
        if (lsErr) throw lsErr;
        const stockLocalMap = {};
        (localSt || []).forEach(s => stockLocalMap[s.producto_id] = s.cantidad);

        const { data: factorySt, error: fsErr } = await supabase
          .from('stock_sucursales')
          .select('producto_id, cantidad')
          .eq('sucursal_id', 1)
          .eq('es_evento', orderIsEvent);
        if (fsErr) throw fsErr;
        const stockFabricaMap = {};
        (factorySt || []).forEach(s => stockFabricaMap[s.producto_id] = s.cantidad);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: consumosRaw, error: cErr } = await supabase
          .from('consumo_diario')
          .select('producto_id, cantidad')
          .eq('sucursal_id', user.sucursal_id)
          .eq('es_evento', false)
          .gte('fecha', sevenDaysAgo.toISOString());
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
          const promedioConsumo = count > 0 ? (sum / count) : 0;

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
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [user, activeTab, orderIsEvent]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // Auto-refresh stats every 15 seconds to keep it live
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchMaquinasYMantenimientos = useCallback(async () => {
    if (!user || user.rol !== 'admin') return;
    try {
      const { data: maqData, error: maqErr } = await supabase
        .from('maquinas')
        .select(`
          *,
          sucursales ( nombre )
        `)
        .order('nombre');
      if (maqErr) throw maqErr;
      
      const mappedMaq = (maqData || []).map(m => ({
        ...m,
        sucursal_nombre: m.sucursales?.nombre || 'Sin Sucursal'
      }));
      setMaquinas(mappedMaq);

      const { data: mantData, error: mantErr } = await supabase
        .from('mantenimientos')
        .select(`
          *,
          maquinas ( nombre, marca, modelo, tipo_equipo )
        `)
        .order('fecha', { ascending: false });
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
      let query = supabase.from('consumo_diario').select('*, usuarios:creado_por (nombre)');
      if (auditoriaFilterSucursal) {
        query = query.eq('sucursal_id', auditoriaFilterSucursal);
      }
      if (auditoriaFilterDays) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - parseInt(auditoriaFilterDays));
        query = query.gte('fecha', pastDate.toISOString());
      }
      const { data, error } = await query.order('fecha', { ascending: false });
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
    link.setAttribute("download", `auditoria_consumo_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Production Form Submit
  const handleProductionSubmit = async (e) => {
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

      // Check if it's ice cream and parse weights
      const selectedProd = productos.find(p => p.id === pId);
      let pesosArray = [];
      if (selectedProd && selectedProd.categoria === 'helados') {
        pesosArray = prodWeights.map(w => parseFloat(w) || 0);
        if (pesosArray.length !== qty || pesosArray.some(w => w <= 0)) {
          throw new Error('Por favor, ingresa un peso válido mayor a 0 para cada unidad.');
        }
      }

      // Business rule: ice cream vasquetas cannot be for events
      const isEvent = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k' ? false : (prodForm.es_evento || false);

      // Call RPC to insert production batch and update stock atomically
      const { error: rpcErr } = await supabase.rpc('registrar_produccion', {
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
      setProdForm({ producto_id: '', cantidad: '', fecha: getLocalDateString(), es_evento: false });
      setProdWeights([]);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Admin Historic Production Form Submit
  const handleAdminHistSubmit = async (e) => {
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

      // Check if it's ice cream and parse weights
      const selectedProd = productos.find(p => p.id === pId);
      let pesosArray = [];
      if (selectedProd && selectedProd.categoria === 'helados') {
        pesosArray = adminHistWeights.map(w => parseFloat(w) || 0);
        if (pesosArray.length !== qty || pesosArray.some(w => w <= 0)) {
          throw new Error('Por favor, ingresa un peso válido mayor a 0 para cada unidad.');
        }
      }

      // Business rule: ice cream vasquetas cannot be for events
      const isEvent = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k' ? false : (adminHistForm.es_evento || false);

      // Call RPC to insert production batch and update stock atomically
      const { error: rpcErr } = await supabase.rpc('registrar_produccion', {
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
      setAdminHistForm({ producto_id: '', cantidad: '', fecha: getLocalDateString(), es_evento: false });
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

  // Transportista Insumos/Products Load Form Submit
  const handleTranspCargaSubmit = async (e) => {
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
      const codigo_lote = `C-${dateStr}-${rand}`; // C for Compra

      // Call RPC to insert production batch and update stock atomically
      const { error: rpcErr } = await supabase.rpc('registrar_produccion', {
        p_codigo_lote: codigo_lote,
        p_producto_id: pId,
        p_cantidad: finalQty,
        p_pesos: [], // No weights for purchases usually
        p_fecha_produccion: pDate.toISOString(),
        p_creado_por: user.id,
        p_es_evento: false
      });
      if (rpcErr) throw rpcErr;


      showToast(`Ingreso de mercadería registrado (Ref: ${codigo_lote}). Stock de fábrica actualizado.`);
      setTranspCargaForm({ producto_id: '', proveedor_id: '', cantidad: '', fecha: getLocalDateString() });
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error al registrar la carga: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Proveedores
  const handleProvSubmit = async (e) => {
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
        const { error } = await supabase
          .from('proveedores')
          .update(payload)
          .eq('id', editingProv.id);
        if (error) throw error;
        showToast('Proveedor actualizado con éxito.');
      } else {
        const { error } = await supabase
          .from('proveedores')
          .insert(payload);
        if (error) throw error;
        showToast('Proveedor creado con éxito.');
      }
      setShowProvModal(false);
      setEditingProv(null);
      setProvForm({ nombre: '', cuit: '', telefono: '', direccion: '', email: '' });
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
      const { error } = await supabase.from('proveedores').delete().eq('id', id);
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

  // Admin Historic Bulk Template Download
  const handleDownloadHistTemplate = () => {
    const prods = productos.filter(p => p.categoria === histBulkCategory && p.activo === 1);
    const headers = ['ID_Producto', 'Nombre', 'Formato', 'Cantidad', 'Peso_Bruto_Unitario_Opcional', 'Fecha_Opcional', 'Destinar_A_Eventos_SI_NO'];
    
    // Add BOM (\uFEFF) for proper Excel Spanish character encoding support
    let csvContent = '\uFEFF' + headers.join(';') + '\n';

    prods.forEach(p => {
      let suggestedWeight = '';
      if (p.categoria === 'helados') {
        if (p.tipo === 'vasqueta_5_6k') suggestedWeight = '6.120';
        else if (p.tipo === 'balde_4k') suggestedWeight = '4.155';
        else if (p.tipo === 'balde_8k') suggestedWeight = '8.270';
      }
      const row = [
        p.id,
        p.nombre.replace(/;/g, ','), // escape semicolon
        formatTipo(p.tipo) || '',
        '0',
        suggestedWeight,
        getLocalDateString(),
        'NO'
      ];
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_carga_historica_${histBulkCategory}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Plantilla descargada para la categoría ${categories.find(c => c.id === histBulkCategory)?.name}.`);
  };

  // Admin Historic Bulk Template Upload & Process
  const handleUploadHistTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          throw new Error('El archivo está vacío o solo contiene la cabecera.');
        }

        // Detect delimiter (semicolon or comma)
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
            const { product, qty, rawWeights, dateVal, esEventoVal } = row;

            const dateStr = dateVal.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const codigo_lote = `L-${dateStr}-${rand}`;

            let pesosArray = [];
            if (product.categoria === 'helados') {
              const tare = getTareByTipo(product.tipo);
              const fallbackGross = tare + getProductNetWeight(product.id, product.tipo);
              
              if (rawWeights) {
                // Split by semicolon, slash, vertical bar, or whitespace (except decimal dots)
                const weightStrings = rawWeights.split(/[;/|\s]+/).filter(w => w.trim() !== '');
                if (weightStrings.length > 1) {
                  // Parse list of weights
                  pesosArray = weightStrings.map(w => {
                    const cleaned = w.replace(',', '.');
                    return parseFloat(cleaned) || fallbackGross;
                  });
                  // Pad to match quantity
                  while (pesosArray.length < qty) {
                    pesosArray.push(pesosArray[pesosArray.length - 1] || fallbackGross);
                  }
                  // Truncate to match quantity
                  if (pesosArray.length > qty) {
                    pesosArray = pesosArray.slice(0, qty);
                  }
                } else {
                  // Single weight provided, repeat it
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

            const { error: rpcErr } = await supabase.rpc('registrar_produccion', {
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

  // Branch Consumption Form Submit
  const handleConsumoSubmit = async (e) => {
    e.preventDefault();
    if (!consumoForm.producto_id || !consumoForm.cantidad) return;
    setLoading(true);
    try {
      const pId = parseInt(consumoForm.producto_id);
      const qty = parseInt(consumoForm.cantidad);
      const isEvent = consumoForm.es_evento || false;

      // Call RPC to register consumption atomically in database transaction
      const { error: rpcErr } = await supabase.rpc('registrar_consumo', {
        p_sucursal_id: user.sucursal_id,
        p_producto_id: pId,
        p_cantidad: qty,
        p_es_evento: isEvent,
        p_creado_por: user.id
      });
      if (rpcErr) throw rpcErr;

      showToast('Consumo registrado exitosamente.');
      setConsumoForm({ producto_id: '', cantidad: '', es_evento: false });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Branch create order
  const handleCreateOrder = async () => {
    const items = Object.entries(orderItems)
      .map(([prodId, qty]) => ({ producto_id: parseInt(prodId), cantidad_solicitada: parseInt(qty) }))
      .filter(item => item.cantidad_solicitada > 0);

    if (items.length === 0) {
      showToast('Por favor, selecciona al menos 1 producto con cantidad mayor a 0.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Insert pedido
      const { data: newPedido, error: insErr } = await supabase
        .from('pedidos')
        .insert({
          sucursal_destino_id: user.sucursal_id,
          creado_por_id: user.id,
          es_evento: (user.rol === 'admin' || user.rol === 'heladero') ? orderIsEvent : false,
          estado: 'solicitado'
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const pedido_id = newPedido.id;

      // Insert details
      const details = items.map(item => ({
        pedido_id,
        producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad_solicitada,
        cantidad_preparada: item.cantidad_solicitada
      }));

      const { error: detErr } = await supabase
        .from('pedido_detalles')
        .insert(details);

      if (detErr) throw detErr;

      // Clean up re-ordered items from pending list
      const orderedProdIds = items.map(item => item.producto_id);
      const { error: delPendErr } = await supabase
        .from('items_pendientes')
        .delete()
        .eq('sucursal_id', user.sucursal_id)
        .eq('es_evento', orderIsEvent)
        .in('producto_id', orderedProdIds);
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

  // Admin creates/builds prepared order
  const handleAdminCreateOrder = async () => {
    const items = Object.entries(adminOrderItems)
      .map(([prodId, qty]) => ({ producto_id: parseInt(prodId), cantidad_solicitada: parseInt(qty) }))
      .filter(item => item.cantidad_solicitada > 0);

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
        // Create order as 'solicitado' (fabrication order)
        const { data: newPedido, error: insErr } = await supabase
          .from('pedidos')
          .insert({
            sucursal_destino_id: parseInt(adminOrderDestination),
            creado_por_id: user.id,
            es_evento: true,
            estado: 'solicitado'
          })
          .select('id')
          .single();

        if (insErr) throw insErr;
        const pedido_id = newPedido.id;

        const details = items.map(item => ({
          pedido_id,
          producto_id: item.producto_id,
          cantidad_solicitada: item.cantidad_solicitada,
          cantidad_preparada: item.cantidad_solicitada
        }));

        const { error: detErr } = await supabase
          .from('pedido_detalles')
          .insert(details);

        if (detErr) throw detErr;

        showToast(`Pedido de Fabricación #${pedido_id} enviado al heladero con éxito.`);
      } else {
        // Call RPC to validate stock, deduct from factory, create order and details atomically
        const { data: pedido_id, error: rpcErr } = await supabase.rpc('crear_y_preparar_pedido_admin', {
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
      setActiveTab('flujo'); // Redirect to order list
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Prefill order quantities using smart suggestions
  const applyAllSuggestions = () => {
    const items = {};
    suggestions.forEach(s => {
      items[s.producto_id] = s.cantidad_sugerida;
    });
    setOrderItems(items);
    showToast('Sugerencias aplicadas. Revisa las cantidades antes de enviar.');
  };
  // Open Order Detail modal/screen
  const handleRetiroInternoSubmit = async (e) => {
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
      // 1. Crear y descontar de fabrica
      const { data: pedido_id, error: rpcErr } = await supabase.rpc('crear_y_preparar_pedido_admin', {
        p_sucursal_destino_id: user.sucursal_id,
        p_creado_por_id: user.id,
        p_es_evento: false,
        p_items: itemsList
      });
      if (rpcErr) throw rpcErr;

      // 2. Recibir inmediatamente para sumarlo al stock local
      const receivePayload = itemsList.map(it => ({
        producto_id: it.producto_id,
        cantidad_recibida: it.cantidad,
        motivo_discrepancia: null
      }));

      const { error: recErr } = await supabase.rpc('recibir_pedido', {
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

  // Open Order Detail modal/screen
  const viewOrderDetail = async (pedidoId) => {
    try {
      const { data: order, error: oErr } = await supabase
        .from('pedidos')
        .select(`
          *,
          s_orig:sucursal_origen_id ( nombre ),
          s_dest:sucursal_destino_id ( nombre )
        `)
        .eq('id', pedidoId)
        .single();

      if (oErr) throw oErr;
      if (!order) throw new Error('Pedido no encontrado.');

      const { data: items, error: iErr } = await supabase
        .from('pedido_detalles')
        .select(`
          *,
          productos ( nombre, tipo, categoria )
        `)
        .eq('pedido_id', pedidoId);

      if (iErr) throw iErr;

      // Fetch stock at Factory (sucursal_id = 1) for both partitions
      const { data: allFactoryStock, error: fsErr } = await supabase
        .from('stock_sucursales')
        .select('producto_id, cantidad, es_evento')
        .eq('sucursal_id', 1);

      if (fsErr) throw fsErr;

      // Map stock by partition
      const eventStockMap = {};
      const commonStockMap = {};
      (allFactoryStock || []).forEach(s => {
        if (s.es_evento) {
          eventStockMap[s.producto_id] = s.cantidad;
        } else {
          commonStockMap[s.producto_id] = s.cantidad;
        }
      });

      // Automatically determine default stock source based on availability of requested items
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

      // Map factory stock of the selected partition for the UI display
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

      // Initialize driver loading quantities
      const loads = {};
      itemsMapped.forEach(it => {
        loads[it.producto_id] = it.cantidad_preparada;
      });
      setLoadItems(loads);

      // Initialize branch receiving quantities
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

  // Prepare Order Submit (Heladero)
  const handlePrepareOrder = async () => {
    if (!selectedPedido) return;

    setLoading(true);
    try {
      const originalIsEvent = selectedPedido.es_evento;
      const targetEsEvento = prepareStockSource === 'evento'; // true if events stock, false if common stock

      // 1. Fetch current factory stock (sucursal_id = 1) for BOTH partitions to handle cross-partition deduction
      const { data: allStock, error: stockFetchErr } = await supabase
        .from('stock_sucursales')
        .select('producto_id, cantidad, es_evento')
        .eq('sucursal_id', 1);
      if (stockFetchErr) throw stockFetchErr;

      // Create maps of product_id -> quantity for both partitions
      const eventStockMap = {};
      const commonStockMap = {};
      allStock.forEach(s => {
        if (s.es_evento) {
          eventStockMap[s.producto_id] = s.cantidad;
        } else {
          commonStockMap[s.producto_id] = s.cantidad;
        }
      });

      // 2. Check each item in the order and swap/adjust stock across partitions
      for (const item of selectedPedido.items) {
        const pId = item.producto_id;
        const requestedQty = item.cantidad_solicitada;

        const qtyPrimary = (targetEsEvento ? eventStockMap[pId] : commonStockMap[pId]) ?? 0;
        const qtySecondary = (targetEsEvento ? commonStockMap[pId] : eventStockMap[pId]) ?? 0;

        if (qtyPrimary >= requestedQty) {
          // Primary stock partition is already sufficient
          continue;
        }

        // We have insufficient stock in the primary partition.
        // We will try to pull as much as possible from the secondary partition.
        const diff = requestedQty - qtyPrimary;
        const takeFromSecondary = Math.min(diff, qtySecondary);

        let finalPrimaryQty = qtyPrimary;

        if (takeFromSecondary > 0) {
          const newQtySecondary = qtySecondary - takeFromSecondary;
          // Deduct from secondary partition in the database
          const { error: updSecErr } = await supabase
            .from('stock_sucursales')
            .update({ cantidad: newQtySecondary })
            .eq('sucursal_id', 1)
            .eq('producto_id', pId)
            .eq('es_evento', !targetEsEvento);
          if (updSecErr) throw updSecErr;

          // Increase virtual primary qty
          finalPrimaryQty += takeFromSecondary;
        }

        // If we still don't have enough, auto-adjust the primary partition stock
        // to match the requestedQty so the database RPC preparar_pedido doesn't throw stock error
        if (finalPrimaryQty < requestedQty) {
          finalPrimaryQty = requestedQty;
        }

        // Write the adjusted primary qty to the database
        const hasPrimaryRow = (targetEsEvento ? eventStockMap[pId] !== undefined : commonStockMap[pId] !== undefined);
        if (hasPrimaryRow) {
          const { error: updPriErr } = await supabase
            .from('stock_sucursales')
            .update({ cantidad: finalPrimaryQty })
            .eq('sucursal_id', 1)
            .eq('producto_id', pId)
            .eq('es_evento', targetEsEvento);
          if (updPriErr) throw updPriErr;
        } else {
          const { error: insPriErr } = await supabase
            .from('stock_sucursales')
            .insert({
              sucursal_id: 1,
              producto_id: pId,
              cantidad: finalPrimaryQty,
              es_evento: targetEsEvento
            });
          if (insPriErr) throw insPriErr;
        }
      }

      // 3. Temporarily set es_evento of the order to match the selected targetEsEvento so the RPC deducts from the correct partition
      const { error: updErr } = await supabase
        .from('pedidos')
        .update({ es_evento: targetEsEvento })
        .eq('id', selectedPedido.id);
      if (updErr) throw updErr;

      // 4. Call RPC to prepare order, validating and deducting stock atomically
      const { error: rpcErr } = await supabase.rpc('preparar_pedido', {
        p_pedido_id: selectedPedido.id,
        p_preparado_por_id: user.id
      });

      if (rpcErr) {
        // Rollback es_evento if RPC failed
        await supabase
          .from('pedidos')
          .update({ es_evento: originalIsEvent })
          .eq('id', selectedPedido.id);
        throw rpcErr;
      }

      // 5. If successful, restore es_evento to its original value if it differs from targetEsEvento
      if (originalIsEvent !== targetEsEvento) {
        const { error: restoreErr } = await supabase
          .from('pedidos')
          .update({ es_evento: originalIsEvent })
          .eq('id', selectedPedido.id);
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

  // Confirm loading in truck (Transportista)
  const handleConfirmLoad = async () => {
    if (!selectedPedido) return;

    const items = Object.entries(loadItems).map(([prodId, qty]) => ({
      producto_id: parseInt(prodId),
      cantidad_cargada: parseInt(qty)
    }));

    setLoading(true);
    try {
      // Call RPC to process loaded quantities, pending items, factory stock returns, and status updates atomically
      const { error: rpcErr } = await supabase.rpc('confirmar_carga_pedido', {
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

  // Log rotura/pérdida en viaje (Transportista)
  const handleReportLoss = async (e) => {
    e.preventDefault();
    if (!transitLoss.producto_id || !transitLoss.cantidad_perdida) return;

    setLoading(true);
    try {
      const pId = parseInt(transitLoss.producto_id);
      const qtyLost = parseInt(transitLoss.cantidad_perdida);
      const motivo = transitLoss.motivo || 'Rotura en viaje';

      const itemDetail = selectedPedido.items.find(it => it.producto_id === pId);
      const currentCargado = itemDetail ? itemDetail.cantidad_cargada : 0;

      const { error: updDetErr } = await supabase
        .from('pedido_detalles')
        .update({ cantidad_cargada: Math.max(0, currentCargado - qtyLost) })
        .eq('pedido_id', selectedPedido.id)
        .eq('producto_id', pId);
      if (updDetErr) throw updDetErr;

      const { error: discErr } = await supabase
        .from('discrepancias')
        .insert({
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
      setTransitLoss({ producto_id: '', cantidad_perdida: '', motivo: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Driver physically delivers order
  const handleMarkDelivered = async () => {
    if (!selectedPedido) return;
    setLoading(true);
    try {
      const { error: updOrderErr } = await supabase
        .from('pedidos')
        .update({
          fecha_entrega: new Date().toISOString()
        })
        .eq('id', selectedPedido.id);

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

  // Branch confirms receipt (Double Confirmation)
  const handleConfirmReceive = async () => {
    if (!selectedPedido) return;

    const items = Object.entries(receiveItems).map(([prodId, qty]) => ({
      producto_id: parseInt(prodId),
      cantidad_recibida: parseInt(qty),
      motivo_diferencia: receiveReasons[prodId] || ''
    }));

    setLoading(true);
    try {
      // Call RPC to handle physical receipt, update stock at destination, deduct from factory if needed, and log discrepancies
      const { error: rpcErr } = await supabase.rpc('recibir_pedido', {
        p_pedido_id: selectedPedido.id,
        p_recibido_por_id: user.id,
        p_items: items
      });
      if (rpcErr) throw rpcErr;

      // Determine final status locally to show in toast based on difference values
      let hasDiscrepancies = false;
      for (let item of items) {
        const origDetail = selectedPedido.items.find(it => it.producto_id === item.producto_id);
        const loadedQty = selectedPedido.estado === 'solicitado' ? item.cantidad_recibida : (origDetail ? (origDetail.cantidad_cargada > 0 ? origDetail.cantidad_cargada : origDetail.cantidad_preparada) : 0);
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

  // Admin creates new supplier inline
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setLoading(true);
    try {
      const { data: newProv, error: insErr } = await supabase
        .from('proveedores')
        .insert({ nombre: newSupplierName.trim() })
        .select('*')
        .single();

      if (insErr) throw insErr;

      showToast(`Proveedor "${newProv.nombre}" creado con éxito.`);
      setNewSupplierName('');
      setShowSupplierForm(false);

      // Refresh local suppliers list and pre-select the new one
      setProveedores(prev => [...prev, newProv].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewProductForm(prev => ({ ...prev, proveedor_id: newProv.id }));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Admin creates new product
  const handleNewProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProductForm.nombre) return;
    setLoading(true);
    try {
      const { data: newProd, error: insErr } = await supabase
        .from('productos')
        .insert({
          nombre: newProductForm.nombre,
          categoria: newProductForm.categoria,
          tipo: newProductForm.tipo,
          proveedor_id: newProductForm.proveedor_id ? parseInt(newProductForm.proveedor_id) : null,
          unidad_medida: newProductForm.unidad_medida,
          cant_por_caja: newProductForm.cant_por_caja ? parseInt(newProductForm.cant_por_caja) : 24,
          cant_por_pack: newProductForm.cant_por_pack ? parseInt(newProductForm.cant_por_pack) : null
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const newProductId = newProd.id;

      const { data: branches, error: bErr } = await supabase
        .from('sucursales')
        .select('id');
      if (bErr) throw bErr;

      const stockInserts = (branches || []).map(b => ({
        sucursal_id: b.id,
        producto_id: newProductId,
        cantidad: 0
      }));

      const { error: sErr } = await supabase
        .from('stock_sucursales')
        .insert(stockInserts);
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

  // Admin updates existing product
  const handleUpdateProduct = async () => {
    if (!newProductForm.nombre || !editingProduct) return;
    setLoading(true);
    try {
      const { error: updErr } = await supabase
        .from('productos')
        .update({
          nombre: newProductForm.nombre,
          categoria: newProductForm.categoria,
          tipo: newProductForm.tipo,
          proveedor_id: newProductForm.proveedor_id ? parseInt(newProductForm.proveedor_id) : null,
          unidad_medida: newProductForm.unidad_medida,
          cant_por_caja: newProductForm.cant_por_caja ? parseInt(newProductForm.cant_por_caja) : 24,
          cant_por_pack: newProductForm.cant_por_pack ? parseInt(newProductForm.cant_por_pack) : null
        })
        .eq('id', editingProduct.id);

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

  const handleProductFormSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      handleUpdateProduct();
    } else {
      handleNewProductSubmit(e);
    }
  };

  const startEditingProduct = (p) => {
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

  // Admin toggles active status of a product (soft delete / reactivate)
  const handleToggleProductActive = async (prodId, currentActive) => {
    setLoading(true);
    try {
      const nextActive = currentActive === 1 ? 0 : 1;
      const { error: updErr } = await supabase
        .from('productos')
        .update({ activo: nextActive })
        .eq('id', prodId);

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

  const handleBranchCreateOtrosProduct = async (e) => {
    e.preventDefault();
    if (!branchOtrosForm.nombre) return;
    setLoading(true);
    try {
      // 1. Insert product in Supabase
      const { data: newProd, error: insErr } = await supabase
        .from('productos')
        .insert({
          nombre: branchOtrosForm.nombre,
          categoria: 'otros',
          tipo: branchOtrosForm.tipo
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const newProductId = newProd.id;

      // 2. Initialize stock in 0 for all branches
      const { data: branches, error: bErr } = await supabase
        .from('sucursales')
        .select('id');
      if (bErr) throw bErr;

      const stockInserts = (branches || []).map(b => ({
        sucursal_id: b.id,
        producto_id: newProductId,
        cantidad: 0
      }));

      const { error: sErr } = await supabase
        .from('stock_sucursales')
        .insert(stockInserts);
      if (sErr) throw sErr;

      showToast('Producto personalizado creado en Otros.');
      setBranchOtrosForm({ nombre: '', tipo: 'packaging' });

      // Refresh data
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Return badge class for order state
  const getBadgeClass = (state) => {
    return `badge badge-${state}`;
  };

  const translateState = (state) => {
    const trans = {
      solicitado: 'Solicitado',
      preparado: 'Preparado',
      en_transito: 'En viaje',
      entregado: 'Entregado OK',
      con_discrepancia: 'Diferencias'
    };
    return trans[state] || state;
  };

  // ================= CRUD Y AYUDANTES DE MÁQUINAS Y MANTENIMIENTOS =================

  const getMaintenanceOptionsForMachine = (maquinaId) => {
    const maquina = maquinas.find(m => m.id === parseInt(maquinaId));
    if (!maquina) return [{ value: 'otro', label: 'Otro' }];
    
    switch (maquina.tipo_equipo) {
      case 'maquina_helado':
        return [
          { value: 'limpieza_circuito', label: 'Limpieza de circuito' },
          { value: 'revision_tecnica', label: 'Revisión técnica por mal funcionamiento' },
          { value: 'otro', label: 'Otro' }
        ];
      case 'frio_abatidor_heladera_camara':
        return [
          { value: 'limpieza_motor', label: 'Mantenimiento / Limpieza del motor' },
          { value: 'revision_tecnica', label: 'Revisión técnica por mal funcionamiento' },
          { value: 'otro', label: 'Otro' }
        ];
      case 'aire_acondicionado':
        return [
          { value: 'limpieza_filtros', label: 'Limpieza de filtros' },
          { value: 'revision_tecnica', label: 'Revisión técnica por mal funcionamiento' },
          { value: 'otro', label: 'Otro' }
        ];
      case 'licuadora_horno_batidora_micro':
        return [
          { value: 'revision_tecnica', label: 'Revisión técnica por mal funcionamiento' },
          { value: 'otro', label: 'Otro' }
        ];
      default:
        return [
          { value: 'limpieza_circuito', label: 'Limpieza de circuito' },
          { value: 'limpieza_motor', label: 'Mantenimiento / Limpieza del motor' },
          { value: 'limpieza_filtros', label: 'Limpieza de filtros' },
          { value: 'revision_tecnica', label: 'Revisión técnica por mal funcionamiento' },
          { value: 'otro', label: 'Otro' }
        ];
    }
  };

  const getEquipoIcon = (type) => {
    switch (type) {
      case 'licuadora_horno_batidora_micro': return '🌪️';
      case 'maquina_helado': return '🍦';
      case 'frio_abatidor_heladera_camara': return '❄️';
      case 'aire_acondicionado': return '💨';
      default: return '⚙️';
    }
  };

  const getEquipoTypeLabel = (type) => {
    const labels = {
      licuadora_horno_batidora_micro: 'Licuadora / Horno / Batidora / Microondas',
      maquina_helado: 'Máquina de Helado',
      frio_abatidor_heladera_camara: 'Abatidor / Heladera / Cámara (Frío)',
      aire_acondicionado: 'Aire Acondicionado',
      otro: 'Otro Equipo'
    };
    return labels[type] || type;
  };

  const getMaintenanceTypeLabel = (type) => {
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

    // Group by machine and type to get the latest proxima_fecha
    const latestScheduled = {};

    mantenimientos.forEach(m => {
      if (!m.proxima_fecha) return;
      const key = `${m.maquina_id}-${m.tipo}`;
      const current = latestScheduled[key];
      
      // If we haven't seen this machine/type combo yet, or this record is newer (by date of maintenance)
      if (!current || new Date(m.fecha) > new Date(current.fecha)) {
        latestScheduled[key] = m;
      }
    });

    Object.values(latestScheduled).forEach(m => {
      const proxDate = new Date(m.proxima_fecha);
      const diffTime = proxDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Find machine details
      const maquina = maquinas.find(maq => maq.id === m.maquina_id);
      if (!maquina || maquina.estado === 'de_baja') return; // Skip if machine is discarded

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

  const handleSaveMaquina = async (e) => {
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
        const { error } = await supabase
          .from('maquinas')
          .update(dataToSave)
          .eq('id', editingMaquina.id);
        if (error) throw error;
        showToast('Máquina actualizada con éxito.');
      } else {
        const { error } = await supabase
          .from('maquinas')
          .insert(dataToSave);
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

  const handleSaveStockAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { producto_id, sucursal_id, es_evento, cantidad } = editStockForm;
      const numCant = parseInt(cantidad);
      if (isNaN(numCant) || numCant < 0) throw new Error("La cantidad debe ser un número válido mayor o igual a cero.");

      const { data: existing, error: eErr } = await supabase
        .from('stock_sucursales')
        .select('*')
        .eq('producto_id', producto_id)
        .eq('sucursal_id', sucursal_id)
        .eq('es_evento', es_evento);
      
      if (eErr) throw eErr;

      if (existing && existing.length > 0) {
        const { error: updErr } = await supabase
          .from('stock_sucursales')
          .update({ cantidad: numCant })
          .eq('producto_id', producto_id)
          .eq('sucursal_id', sucursal_id)
          .eq('es_evento', es_evento);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('stock_sucursales')
          .insert({
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

  const handleEditMaquina = (maq) => {
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

  const handleDeleteMaquina = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta máquina? Se borrará también todo su historial de mantenimiento.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('maquinas')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Máquina eliminada con éxito.');
      fetchMaquinasYMantenimientos();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaintenance = async (e) => {
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
        const { error } = await supabase
          .from('mantenimientos')
          .update(dataToSave)
          .eq('id', editingMaintenance.id);
        if (error) throw error;
        showToast('Registro de mantenimiento actualizado.');
      } else {
        const { error } = await supabase
          .from('mantenimientos')
          .insert(dataToSave);
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

  const handleEditMaintenance = (mant) => {
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

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de mantenimiento?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mantenimientos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Registro de mantenimiento eliminado.');
      fetchMaquinasYMantenimientos();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Rendering login if not logged in
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

        {/* ================= ADMIN VIEW ================= */}
        {user.rol === 'admin' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>Stock de Sucursales</button>
              <button className={`tab-btn ${activeTab === 'flujo' ? 'active' : ''}`} onClick={() => setActiveTab('flujo')}>Flujo de Pedidos</button>
              <button className={`tab-btn ${activeTab === 'armar_pedido' ? 'active' : ''}`} onClick={() => setActiveTab('armar_pedido')}>Armar Pedido</button>
              <button className={`tab-btn ${activeTab === 'auditoria_consumo' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria_consumo')}>Auditoría de Consumo</button>
              <button className={`tab-btn ${activeTab === 'discrepancias' ? 'active' : ''}`} onClick={() => setActiveTab('discrepancias')}>Historial de Pérdidas</button>
              <button className={`tab-btn ${activeTab === 'produccion_req' ? 'active' : ''}`} onClick={() => setActiveTab('produccion_req')}>Proyecciones de Fábrica</button>
              <button className={`tab-btn ${activeTab === 'carga_historica' ? 'active' : ''}`} onClick={() => setActiveTab('carga_historica')}>Carga Histórica</button>
              <button className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveTab('catalogo')}>Productos</button>
              <button className={`tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`} onClick={() => setActiveTab('proveedores')}>Proveedores</button>
              <button className={`tab-btn ${activeTab === 'maquinas' ? 'active' : ''}`} onClick={() => setActiveTab('maquinas')}>Mantenimiento y Máquinas</button>
            </div>

            {activeTab === 'matrix' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0, paddingLeft: '0.5rem' }}>
                    Monitorea los niveles de inventario en tiempo real de cada sabor y producto en todas las locaciones físicas de Biscui.
                  </p>
                  <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <button
                      className={`btn btn-sm ${!showEventStock ? 'btn-primary' : 'btn-outline'}`}
                      style={{ border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', minHeight: 'unset' }}
                      onClick={() => setShowEventStock(false)}
                    >
                      📦 Stock Común
                    </button>
                    <button
                      className={`btn btn-sm ${showEventStock ? 'btn-primary' : 'btn-outline'}`}
                      style={{ border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', minHeight: 'unset' }}
                      onClick={() => setShowEventStock(true)}
                    >
                      🎉 Stock de Eventos
                    </button>
                  </div>
                </div>

                {/* Category Selection Tabs */}
                <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'helados', label: '🍧 Helados' },
                    { id: 'pasteleria_helada', label: '🍦 Pastelería Helada' },
                    { id: 'pasteleria', label: '🍰 Pastelería Clásica' },
                    { id: 'viennoiserie', label: '🥐 Viennoiserie' },
                    { id: 'termicos', label: '📦 Térmicos' },
                    { id: 'otros', label: '✨ Otros' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${adminStockTab === tab.id ? 'active' : ''}`}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        fontWeight: adminStockTab === tab.id ? 600 : 400
                      }}
                      onClick={() => setAdminStockTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {(() => {
                  const selectedCat = categories.find(c => c.id === adminStockTab);
                  if (!selectedCat) return null;

                  let catProds = productos.filter(p => p.categoria === selectedCat.id);
                  if (selectedCat.id === 'helados') {
                    if (stockGroupFilter !== 'Todos') {
                      catProds = catProds.filter(p => getFlavorGroup(p.nombre) === stockGroupFilter);
                    }
                    if (showEventStock) {
                      catProds = catProds.filter(p => p.tipo !== 'vasqueta_5_6k');
                    }
                    if (iceCreamFormatFilter === 'Vasqueta') {
                      catProds = catProds.filter(p => p.tipo === 'vasqueta_5_6k');
                    } else if (iceCreamFormatFilter === 'Balde') {
                      catProds = catProds.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
                    }
                  }

                  if (adminStockSearch) {
                    catProds = catProds.filter(p => 
                      p.nombre.toLowerCase().includes(adminStockSearch.toLowerCase()) ||
                      (p.tipo && formatTipo(p.tipo).toLowerCase().includes(adminStockSearch.toLowerCase()))
                    );
                  }

                  return (
                    <div className="glass-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        <h3 className="section-title" style={{ margin: 0, border: 'none' }}>{selectedCat.name}</h3>
                        
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 600 }}>Buscar:</span>
                            <input
                              type="text"
                              className="form-control search-control-responsive"
                              placeholder="🔍 Buscar sabor..."
                              value={adminStockSearch}
                              onChange={e => setAdminStockSearch(e.target.value)}
                            />
                          </div>

                          {selectedCat.id === 'helados' && (
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                {[
                                  { id: 'Todos', label: 'Todos' },
                                  { id: 'Vasqueta', label: 'Vasquetas' },
                                  { id: 'Balde', label: 'Baldes' }
                                ].map(fmt => (
                                  <button
                                    key={fmt.id}
                                    className={`btn btn-sm ${iceCreamFormatFilter === fmt.id ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}
                                    onClick={() => setIceCreamFormatFilter(fmt.id)}
                                  >
                                    {fmt.label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }}></div>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {['Todos', 'Dulces de leche', 'Chocolate', 'Cremas', 'Sin gluten', 'Frutales al agua'].map(group => (
                                  <button
                                    key={group}
                                    className={`btn btn-sm ${stockGroupFilter === group ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                                    onClick={() => setStockGroupFilter(group)}
                                  >
                                    {group}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {catProds.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                          <p style={{ margin: 0, fontWeight: 500 }}>No se encontraron productos en esta categoría.</p>
                        </div>
                      ) : (
                        <div className="table-container">
                          <table className="stock-matrix-table">
                            <thead>
                              <tr>
                                <th>Producto / Sabor</th>
                                <th>Tipo / Formato</th>
                                {sucursales.map(s => (
                                  <th key={s.id}>{s.nombre}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {catProds.map(prod => {
                                const getCellClass = (qty) => {
                                  if (qty === 0) return 'matrix-cell-empty';
                                  if (qty < 5) return 'matrix-cell-low';
                                  return 'matrix-cell-ok';
                                };

                                return (
                                  <tr key={prod.id}>
                                    <td><strong>{prod.nombre}</strong></td>
                                    <td><span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{formatTipo(prod.tipo)}</span></td>
                                    {sucursales.map(s => {
                                      const qty = stockData.find(st => st.producto_id === prod.id && st.sucursal_id === s.id && st.es_evento === showEventStock)?.cantidad || 0;
                                      return (
                                        <td 
                                          key={s.id} 
                                          className={getCellClass(qty)}
                                          onClick={() => {
                                            if (user.rol === 'admin') {
                                              setEditStockForm({
                                                producto_id: prod.id,
                                                sucursal_id: s.id,
                                                es_evento: showEventStock,
                                                cantidad: qty
                                              });
                                              setEditStockItemDetails({
                                                producto_nombre: prod.nombre,
                                                sucursal_nombre: s.nombre,
                                                tipo: prod.tipo
                                              });
                                              setShowEditStockModal(true);
                                            }
                                          }}
                                          style={user.rol === 'admin' ? { cursor: 'pointer' } : {}}
                                          title={user.rol === 'admin' ? 'Click para editar stock' : ''}
                                        >
                                          {formatQuantityShort(qty, prod)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'armar_pedido' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Armar y Preparar Pedido</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                      Crea un pedido desde Fábrica hacia cualquier sucursal o depósito. Se marcará como <strong>Preparado</strong> y descontará el stock de fábrica automáticamente.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.02)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                      <input
                        type="checkbox"
                        id="adminOrderIsEventCheck"
                        checked={adminOrderIsEvent}
                        onChange={e => {
                          setAdminOrderIsEvent(e.target.checked);
                          setAdminOrderItems({});
                          if (!e.target.checked) setAdminOrderSolicitFabrication(false);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="adminOrderIsEventCheck" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                        🚨 Pedido para EVENTO (Stock de Eventos)
                      </label>
                    </div>

                    {adminOrderIsEvent && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.02)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                        <input
                          type="checkbox"
                          id="adminOrderSolicitFabricationCheck"
                          checked={adminOrderSolicitFabrication}
                          onChange={e => setAdminOrderSolicitFabrication(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="adminOrderSolicitFabricationCheck" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                          🛠️ Solicitar Fabricación al Heladero
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination and Actions bar */}
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
                      📍 Seleccionar Sucursal o Depósito Destino:
                    </label>
                    <select
                      className="form-control"
                      value={adminOrderDestination}
                      onChange={e => setAdminOrderDestination(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'var(--text)',
                        borderRadius: '8px',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      <option value="">-- Seleccionar Destino --</option>
                      {sucursales.filter(s => s.id !== 1).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} {s.id === 5 ? '🚚 (Chofer)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: '2 1 300px', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setAdminOrderItems({});
                        setAdminOrderDestination('');
                      }}
                      style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
                    >
                      Limpiar Todo
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleAdminCreateOrder}
                      disabled={loading}
                      style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}
                    >
                      {adminOrderIsEvent && adminOrderSolicitFabrication ? '🛠️ Solicitar Fabricación' : '🚀 Crear y Preparar Pedido'}
                    </button>
                  </div>
                </div>

                {/* Sub-tabs and Search Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem', background: 'rgba(0, 0, 0, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '2 1 200px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Buscar producto o sabor..."
                        className="form-control"
                        style={{
                          padding: '0.75rem 1.2rem 0.75rem 2.8rem',
                          borderRadius: '12px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          fontSize: '1.05rem',
                          width: '100%'
                        }}
                        value={adminOrderSearch}
                        onChange={e => setAdminOrderSearch(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 180px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Proveedor:</span>
                      <select
                        className="form-control"
                        style={{
                          borderRadius: '10px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          fontSize: '0.9rem',
                          padding: '0.5rem',
                          height: 'auto',
                          minHeight: 'unset'
                        }}
                        value={adminOrderSupplierFilter}
                        onChange={e => setAdminOrderSupplierFilter(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                    {adminOrderSubTab === 'helados' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Formato:</span>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {[
                            { id: 'Todos', label: 'Todos' },
                            { id: 'Vasqueta', label: 'Vasquetas' },
                            { id: 'Balde', label: 'Baldes' }
                          ].map(fmt => (
                            <button
                              key={fmt.id}
                              type="button"
                              className={`btn btn-sm ${iceCreamFormatFilter === fmt.id ? 'btn-primary' : 'btn-outline'}`}
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '6px', minHeight: 'unset', fontWeight: 600 }}
                              onClick={() => setIceCreamFormatFilter(fmt.id)}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'helados', label: '🍧 Helados' },
                      { id: 'pasteleria_helada', label: '🍦 Pastelería Helada' },
                      { id: 'pasteleria', label: '🍰 Pastelería Clásica' },
                      { id: 'viennoiserie', label: '🥐 Viennoiserie' },
                      { id: 'termicos', label: '📦 Térmicos' },
                      { id: 'otros', label: '✨ Otros' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        className={`tab-btn ${adminOrderSubTab === tab.id ? 'active' : ''}`}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          fontWeight: adminOrderSubTab === tab.id ? 600 : 400
                        }}
                        onClick={() => {
                          setAdminOrderSubTab(tab.id);
                          setAdminOrderSearch('');
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  let filteredProds = productos.filter(p => p.categoria === adminOrderSubTab);
                  
                  if (adminOrderIsEvent && adminOrderSubTab === 'helados') {
                    filteredProds = filteredProds.filter(p => p.tipo !== 'vasqueta_5_6k');
                  }

                  if (adminOrderSubTab === 'helados') {
                    if (iceCreamFormatFilter === 'Vasqueta') {
                      filteredProds = filteredProds.filter(p => p.tipo === 'vasqueta_5_6k');
                    } else if (iceCreamFormatFilter === 'Balde') {
                      filteredProds = filteredProds.filter(p => p.tipo === 'balde_4k' || p.tipo === 'balde_8k');
                    }
                  }

                  if (adminOrderSearch) {
                    filteredProds = filteredProds.filter(p =>
                      p.nombre.toLowerCase().includes(adminOrderSearch.toLowerCase()) ||
                      formatTipo(p.tipo).toLowerCase().includes(adminOrderSearch.toLowerCase())
                    );
                  }

                  if (adminOrderSupplierFilter) {
                    filteredProds = filteredProds.filter(p => p.proveedor_id === parseInt(adminOrderSupplierFilter));
                  }

                  if (filteredProds.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                        <p style={{ margin: 0, fontWeight: 500 }}>No se encontraron productos.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Producto / Sabor</th>
                            <th>Stock Fábrica</th>
                            <th>Stock Destino</th>
                            <th style={{ width: '120px' }}>Pedir Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProds.map(prod => {
                            const qty = adminOrderItems[prod.id] || 0;
                            const factoryStock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 1 && s.es_evento === adminOrderIsEvent)?.cantidad || 0;
                            
                            let destStock = '-';
                            if (adminOrderDestination) {
                              destStock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === parseInt(adminOrderDestination) && s.es_evento === adminOrderIsEvent)?.cantidad || 0;
                            }

                            const isExceeding = qty > factoryStock;

                            return (
                              <tr key={prod.id}>
                                <td>
                                  <strong>{prod.nombre}</strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{formatTipo(prod.tipo)}</div>
                                  {isExceeding && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                                      ⚠️ Excede stock disponible en Fábrica ({factoryStock} disponibles)
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span style={{
                                    fontWeight: 600,
                                    color: factoryStock > 0 ? 'var(--success)' : 'var(--danger)'
                                  }}>
                                    {formatQuantity(factoryStock, prod)}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600 }}>
                                    {destStock !== '-' ? formatQuantity(destStock, prod) : '-'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ width: '140px' }}>
                                    <UnitCalculatorInput
                                      value={qty || 0}
                                      onChange={val => {
                                        setAdminOrderItems(prev => ({ ...prev, [prod.id]: val }));
                                      }}
                                      product={prod}
                                      placeholder="0"
                                      min={0}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {Object.values(adminOrderItems).some(q => q > 0) && (
                  <div style={{
                    marginTop: '2rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                  }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span>📋 Resumen del Pedido {adminOrderIsEvent ? '(EVENTO)' : ''}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        {Object.values(adminOrderItems).filter(q => q > 0).length} productos seleccionados
                      </span>
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.2rem' }}>
                      {productos.filter(p => adminOrderItems[p.id] > 0).map(p => (
                        <div key={p.id} style={{ background: 'rgba(0, 0, 0, 0.02)', border: '1px solid rgba(0, 0, 0, 0.06)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <strong>{p.nombre}</strong> ({formatTipo(p.tipo)}): <strong style={{ color: 'var(--primary)' }}>{formatQuantity(adminOrderItems[p.id], p)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'flujo' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Flujo y Auditoría de Pedidos</h3>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por ID, Destino o Estado..."
                    value={adminFlujoSearch}
                    onChange={e => setAdminFlujoSearch(e.target.value)}
                  />
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Destino</th>
                        <th>Estado</th>
                        <th>Solicitado</th>
                        <th>Preparado</th>
                        <th>Despachado</th>
                        <th>Entregado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter(order => {
                          if (!adminFlujoSearch) return true;
                          const q = adminFlujoSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q)) ||
                            (order.estado && translateState(order.estado).toLowerCase().includes(q))
                          );
                        })
                        .map(order => (
                          <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => viewOrderDetail(order.id)}>
                            <td>
                              #{order.id}
                              {order.es_evento && (
                                <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.35rem', marginLeft: '0.3rem' }}>
                                  Evento
                                </span>
                              )}
                            </td>
                            <td><strong>{order.destino_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{order.fecha_solicitud ? new Date(order.fecha_solicitud).toLocaleDateString() : '-'}</td>
                            <td>{order.fecha_preparacion ? new Date(order.fecha_preparacion).toLocaleDateString() : 'Pendiente'}</td>
                            <td>{order.fecha_despacho ? new Date(order.fecha_despacho).toLocaleDateString() : 'Pendiente'}</td>
                            <td>{order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString() : 'Pendiente'}</td>
                          </tr>
                        ))}
                      {orders.filter(order => {
                        if (!adminFlujoSearch) return true;
                        const q = adminFlujoSearch.toLowerCase();
                        return (
                          order.id.toString().includes(q) ||
                          (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q)) ||
                          (order.estado && translateState(order.estado).toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                            No se encontraron pedidos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'auditoria_consumo' && (
              <div className="glass-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Auditoría de Consumo Diario</h3>
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadAuditoriaCSV}>
                    📥 Descargar CSV
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>Sucursal</label>
                    <select className="form-control" value={auditoriaFilterSucursal} onChange={e => setAuditoriaFilterSucursal(e.target.value)}>
                      <option value="">Todas las Sucursales</option>
                      {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>Rango de Fechas</label>
                    <select className="form-control" value={auditoriaFilterDays} onChange={e => setAuditoriaFilterDays(e.target.value)}>
                      <option value="1">Últimas 24 horas</option>
                      <option value="7">Últimos 7 días</option>
                      <option value="30">Últimos 30 días</option>
                      <option value="">Todo el Historial</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha y Hora</th>
                        <th>Sucursal</th>
                        <th>Producto / Sabor</th>
                        <th>Registrado Por</th>
                        <th style={{ textAlign: 'right' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoriaData.map(row => {
                        const prod = productos.find(p => p.id === row.producto_id);
                        const suc = sucursales.find(s => s.id === row.sucursal_id);
                        const isWeight = prod?.unidad_medida === 'peso';
                        const qty = isWeight ? parseFloat(row.cantidad).toFixed(3) : row.cantidad;
                        const unit = isWeight ? "kg" : "unidades";
                        
                        return (
                          <tr key={row.id}>
                            <td>{new Date(row.fecha).toLocaleString()}</td>
                            <td>{suc ? suc.nombre : '-'}</td>
                            <td><strong>{prod ? prod.nombre : '-'}</strong></td>
                            <td>{row.usuarios?.nombre || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {qty} {unit}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {auditoriaData.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros de consumo en este periodo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'discrepancias' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Historial de Pérdidas y Diferencias</h3>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por producto, motivo o usuario..."
                    value={adminDiscrepanciaSearch}
                    onChange={e => setAdminDiscrepanciaSearch(e.target.value)}
                  />
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Cant. Perdida</th>
                        <th>Motivo / Aclaración</th>
                        <th>Reportó</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardStats?.discrepancies
                        .filter(disc => {
                          if (!adminDiscrepanciaSearch) return true;
                          const q = adminDiscrepanciaSearch.toLowerCase();
                          return (
                            (disc.producto_nombre && disc.producto_nombre.toLowerCase().includes(q)) ||
                            (disc.motivo && disc.motivo.toLowerCase().includes(q)) ||
                            (disc.reportado_por_nombre && disc.reportado_por_nombre.toLowerCase().includes(q)) ||
                            (disc.tipo && disc.tipo.toLowerCase().includes(q)) ||
                            (disc.tipo === 'transito' && 'en tránsito'.includes(q)) ||
                            (disc.tipo === 'recepcion' && 'recepción'.includes(q)) ||
                            (disc.tipo === 'produccion' && 'merma fábrica'.includes(q))
                          );
                        })
                        .map(disc => (
                          <tr key={disc.id}>
                            <td>{new Date(disc.fecha_reporte).toLocaleDateString()}</td>
                            <td><strong>{disc.producto_nombre}</strong></td>
                            <td>
                              <span className={`badge ${disc.tipo === 'transito' ? 'badge-en_transito' :
                                  disc.tipo === 'recepcion' ? 'badge-con_discrepancia' : 'badge-solicitado'
                                }`}>
                                {disc.tipo === 'transito' ? 'En Tránsito' :
                                  disc.tipo === 'recepcion' ? 'Recepción' : 'Merma Fábrica'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatQuantity(disc.cantidad_perdida, productos.find(p => p.id === disc.producto_id))}</td>
                            <td>{disc.motivo}</td>
                            <td>{disc.reportado_por_nombre}</td>
                          </tr>
                        ))}
                      {(!dashboardStats?.discrepancies || dashboardStats.discrepancies.filter(disc => {
                        if (!adminDiscrepanciaSearch) return true;
                        const q = adminDiscrepanciaSearch.toLowerCase();
                        return (
                          (disc.producto_nombre && disc.producto_nombre.toLowerCase().includes(q)) ||
                          (disc.motivo && disc.motivo.toLowerCase().includes(q)) ||
                          (disc.reportado_por_nombre && disc.reportado_por_nombre.toLowerCase().includes(q)) ||
                          (disc.tipo && disc.tipo.toLowerCase().includes(q))
                        );
                      }).length === 0) && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                            No hay mermas o discrepancias registradas que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'produccion_req' && (
              <div>
                <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.8rem' }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Sugerencias de Fabricación (Demanda vs Stock Fábrica)</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem', marginBottom: 0 }}>
                        Flujo de planificación inteligente: sabores solicitados por sucursales en pedidos activos que superan el stock actual en fábrica.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar:</span>
                      <input
                        type="text"
                        className="form-control search-control-responsive"
                        placeholder="🔍 Buscar producto..."
                        value={prodReqSearch}
                        onChange={e => setProdReqSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto / Sabor</th>
                          <th>Tipo</th>
                          <th>Pendiente de Entrega</th>
                          <th>Stock Fábrica Actual</th>
                          <th>Diferencia a Fabricar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let items = dashboardStats?.productionNeeded || [];
                          if (prodReqSearch) {
                            items = items.filter(prod => 
                              prod.producto_nombre.toLowerCase().includes(prodReqSearch.toLowerCase()) ||
                              (prod.tipo && prod.tipo.toLowerCase().includes(prodReqSearch.toLowerCase()))
                            );
                          }
                          return items.map(prod => (
                            <tr key={prod.producto_id}>
                              <td><strong>{prod.producto_nombre}</strong></td>
                              <td style={{ textTransform: 'capitalize' }}>{prod.tipo}</td>
                              <td style={{ fontWeight: 600 }}>{prod.cantidad_pendiente}</td>
                              <td>{prod.stock_fabrica || 0}</td>
                              <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                                {Math.max(0, prod.cantidad_pendiente - (prod.stock_fabrica || 0))}
                              </td>
                            </tr>
                          ));
                        })()}
                        {(!dashboardStats?.productionNeeded || dashboardStats.productionNeeded.length === 0) && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                              El stock en Fábrica es suficiente para cubrir todos los pedidos activos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Historial de Fabricación Reciente (Lotes y Pesos)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                    Historial de lotes producidos por el personal de fábrica, incluyendo los pesos brutos y netos registrados para helados.
                  </p>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Formato / Tipo</th>
                          <th>Unidades</th>
                          <th>Pesos de Unidades (Bruto)</th>
                          <th>Peso Neto Total</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes.map(l => {
                          const isHelado = l.productos?.categoria === 'helados';
                          const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
                          const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;

                          return (
                            <tr key={l.id}>
                              <td><code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>{l.codigo_lote}</code></td>
                              <td><strong>{l.productos?.nombre}</strong></td>
                              <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{formatTipo(l.productos?.tipo)}</td>
                              <td><strong>{formatQuantity(l.cantidad, l.productos)}</strong></td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? (
                                  <span style={{ fontSize: '0.85rem' }}>
                                    {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                                )}
                              </td>
                              <td>
                                {isHelado && l.pesos && l.pesos.length > 0 ? (
                                  <strong style={{ color: 'var(--success)' }}>{netKilos.toFixed(2)} kg</strong>
                                ) : (
                                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                                )}
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{new Date(l.fecha_produccion).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        {recentLotes.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                              No hay lotes de producción registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'catalogo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Header with Title and Add Button */}
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>Catálogo de Productos</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
                      Administra todos los productos cargados en el sistema (activos e inactivos).
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      cancelEditingProduct();
                      setShowProductModal(true);
                    }}
                  >
                    ➕ Agregar Nuevo Producto
                  </button>
                </div>

                {/* Filter Controls Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Search Bar */}
                    <div style={{ position: 'relative', flex: '2 1 250px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Buscar producto o sabor..."
                        className="form-control"
                        style={{
                          padding: '0.75rem 1.2rem 0.75rem 2.8rem',
                          borderRadius: '12px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          fontSize: '1.05rem',
                          width: '100%'
                        }}
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                      />
                    </div>

                    {/* Supplier Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Proveedor:</span>
                      <select
                        className="form-control"
                        style={{
                          borderRadius: '10px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          fontSize: '0.9rem',
                          padding: '0.5rem',
                          height: 'auto',
                          minHeight: 'unset'
                        }}
                        value={catalogSupplier}
                        onChange={e => setCatalogSupplier(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 180px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Estado:</span>
                      <select
                        className="form-control"
                        style={{
                          borderRadius: '10px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          fontSize: '0.9rem',
                          padding: '0.5rem',
                          height: 'auto',
                          minHeight: 'unset'
                        }}
                        value={catalogStatus}
                        onChange={e => setCatalogStatus(e.target.value)}
                      >
                        <option value="Todos">Todos</option>
                        <option value="Activos">Activos</option>
                        <option value="Inactivos">Inactivos</option>
                      </select>
                    </div>

                    {/* Format/Type Filter (for Helados / Todos) */}
                    {(catalogCategory === 'helados' || catalogCategory === 'Todos') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Formato:</span>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {[
                            { id: 'Todos', label: 'Todos' },
                            { id: 'Vasqueta', label: 'Vasquetas' },
                            { id: 'Balde', label: 'Baldes' }
                          ].map(fmt => (
                            <button
                              key={fmt.id}
                              type="button"
                              className={`btn btn-sm ${catalogFormat === fmt.id ? 'btn-primary' : 'btn-outline'}`}
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '6px', minHeight: 'unset', fontWeight: 600 }}
                              onClick={() => setCatalogFormat(fmt.id)}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categories Sub-Tabs */}
                  <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.8rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'Todos', label: '🌐 Todos' },
                      { id: 'helados', label: '🍧 Helados' },
                      { id: 'pasteleria_helada', label: '🍦 Pastelería Helada' },
                      { id: 'pasteleria', label: '🍰 Pastelería Clásica' },
                      { id: 'viennoiserie', label: '🥐 Viennoiserie' },
                      { id: 'termicos', label: '📦 Térmicos' },
                      { id: 'otros', label: '✨ Otros' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`btn btn-sm ${catalogCategory === tab.id ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px', minHeight: 'unset', fontWeight: 600 }}
                        onClick={() => {
                          setCatalogCategory(tab.id);
                          if (tab.id !== 'helados' && tab.id !== 'Todos') {
                            setCatalogFormat('Todos');
                          }
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full-width Product List */}
                <div className="glass-card">
                  <div className="table-container" style={{ maxHeight: '700px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Producto / Sabor</th>
                          <th>Formato / Tipo</th>
                          <th>Proveedor</th>
                          <th>Estado</th>
                          <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredProductsList = allProducts.filter(p => {
                            // Search filter
                            if (catalogSearch.trim()) {
                              const q = catalogSearch.toLowerCase().trim();
                              if (!p.nombre.toLowerCase().includes(q)) return false;
                            }
                            // Category filter
                            if (catalogCategory !== 'Todos' && p.categoria !== catalogCategory) {
                              return false;
                            }
                            // Format/Type filter
                            if (catalogCategory === 'helados' || catalogCategory === 'Todos') {
                              if (catalogFormat === 'Vasqueta' && p.tipo !== 'vasqueta_5_6k') {
                                return false;
                              }
                              if (catalogFormat === 'Balde' && p.tipo !== 'balde_4k' && p.tipo !== 'balde_8k') {
                                return false;
                              }
                            }
                            // Supplier filter
                            if (catalogSupplier && p.proveedor_id !== parseInt(catalogSupplier)) {
                              return false;
                            }
                            // Status filter
                            if (catalogStatus === 'Activos' && p.activo !== 1) return false;
                            if (catalogStatus === 'Inactivos' && p.activo !== 0) return false;
                            
                            return true;
                          });

                          if (filteredProductsList.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                                  {allProducts.length === 0
                                    ? 'No hay productos registrados en el catálogo.'
                                    : 'No hay productos que coincidan con los filtros seleccionados.'}
                                </td>
                              </tr>
                            );
                          }

                          return filteredProductsList.map(p => (
                            <tr key={p.id} style={{ opacity: p.activo === 0 ? 0.6 : 1 }}>
                              <td>
                                <strong>{p.nombre}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                                  Categoría: {p.categoria?.replace(/_/g, ' ')} | Medida: {p.unidad_medida === 'peso' ? 'Peso (kg)' : 'Unidad'}
                                </div>
                              </td>
                              <td><span style={{ fontSize: '0.85rem' }}>{formatTipo(p.tipo)}</span></td>
                              <td><span style={{ fontSize: '0.85rem', color: p.proveedor_nombre ? 'var(--text)' : 'var(--text-light)' }}>
                                {p.proveedor_nombre || '-'}
                              </span></td>
                              <td>
                                <span className={`badge ${p.activo === 1 ? 'badge-entregado' : 'badge-con_discrepancia'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                                  {p.activo === 1 ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                  <button
                                    className="btn btn-sm btn-outline"
                                    style={{ padding: '0.25rem 0.5rem', minHeight: 'unset', fontSize: '0.75rem' }}
                                    onClick={() => startEditingProduct(p)}
                                    disabled={loading}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  {p.activo === 1 ? (
                                    <button
                                      className="btn btn-sm btn-danger"
                                      style={{ padding: '0.25rem 0.5rem', minHeight: 'unset', fontSize: '0.75rem', background: 'var(--danger)' }}
                                      onClick={() => {
                                        if (confirm(`¿Estás seguro de desactivar (eliminar) el producto "${p.nombre}"?`)) {
                                          handleToggleProductActive(p.id, p.activo);
                                        }
                                      }}
                                      disabled={loading}
                                      title="Desactivar / Eliminar"
                                    >
                                      🗑️
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-success"
                                      style={{ padding: '0.25rem 0.5rem', minHeight: 'unset', fontSize: '0.75rem', background: 'var(--success)' }}
                                      onClick={() => handleToggleProductActive(p.id, p.activo)}
                                      disabled={loading}
                                      title="Reactivar"
                                    >
                                      🔄
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Form Modal */}
                {showProductModal && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1100, padding: '1rem',
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
                  }}>
                    <div className="glass-card" style={{ maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.95)', color: '#000' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
                        <h3 className="section-title" style={{ margin: 0, color: 'var(--text-dark)' }}>
                          {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                        </h3>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                          onClick={() => {
                            cancelEditingProduct();
                            setShowProductModal(false);
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleProductFormSubmit}>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Nombre del Sabor o Producto</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProductForm.nombre}
                            onChange={e => setNewProductForm({ ...newProductForm, nombre: e.target.value })}
                            required
                            placeholder="Ej. Vasqueta Sabayón con Almendras"
                            style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Categoría</label>
                          <select
                            className="form-control"
                            value={newProductForm.categoria}
                            onChange={e => handleCategoriaChange(e.target.value)}
                            style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Tipo / Formato</label>
                          <select
                            className="form-control"
                            value={newProductForm.tipo}
                            onChange={e => setNewProductForm({ ...newProductForm, tipo: e.target.value })}
                            style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                          >
                            {getTiposPorCategoria(newProductForm.categoria).map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Proveedor (Opcional)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                              className="form-control"
                              value={newProductForm.proveedor_id || ''}
                              onChange={e => setNewProductForm({ ...newProductForm, proveedor_id: e.target.value })}
                              style={{ flex: 1, border: '1px solid rgba(0,0,0,0.15)' }}
                            >
                              <option value="">-- Sin Proveedor / General --</option>
                              {proveedores.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.4rem 0.8rem', minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                              onClick={() => setShowSupplierForm(!showSupplierForm)}
                              title="Agregar Nuevo Proveedor"
                            >
                              ＋
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label style={{ color: 'var(--text-dark)' }}>Tipo de Medición</label>
                          <select
                            className="form-control"
                            value={newProductForm.unidad_medida}
                            onChange={e => setNewProductForm({ ...newProductForm, unidad_medida: e.target.value })}
                            style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                          >
                            <option value="unidad">Unidad</option>
                            <option value="peso">Peso (kg)</option>
                          </select>
                        </div>

                        {showSupplierForm && (
                          <div style={{
                            marginTop: '0.5rem',
                            marginBottom: '1.2rem',
                            background: 'rgba(0,0,0,0.03)',
                            border: '1px dashed rgba(0,0,0,0.15)',
                            borderRadius: '8px',
                            padding: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem'
                          }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                              ➕ Agregar Nuevo Proveedor Inline
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="text"
                                placeholder="Nombre del proveedor"
                                className="form-control"
                                value={newSupplierName}
                                onChange={e => setNewSupplierName(e.target.value)}
                                style={{ fontSize: '0.85rem', padding: '0.4rem', border: '1px solid rgba(0,0,0,0.15)' }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={handleCreateSupplier}
                                disabled={loading}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', minHeight: 'unset' }}
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setShowSupplierForm(false);
                                  setNewSupplierName('');
                                }}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', minHeight: 'unset', borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {editingProduct ? 'Guardar Cambios' : 'Agregar al Catálogo'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              cancelEditingProduct();
                              setShowProductModal(false);
                            }}
                            disabled={loading}
                            style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'carga_historica' && (
              <div className="dashboard-grid">
                <div className="glass-card" style={{ maxWidth: '500px' }}>
                  <h3 className="section-title">Carga de Producción Histórica / Pre-Sistema</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                    Registra producciones anteriores al sistema para inicializar el stock en fábrica y mantener la trazabilidad de lotes y pesos.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px' }}>
                    <button 
                      type="button"
                      className={`btn btn-sm ${histCargaMode === 'individual' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, border: 'none', borderRadius: '8px', padding: '0.5rem', minHeight: 'unset', fontSize: '0.85rem', fontWeight: 600 }}
                      onClick={() => setHistCargaMode('individual')}
                    >
                      Individual
                    </button>
                    <button 
                      type="button"
                      className={`btn btn-sm ${histCargaMode === 'masiva' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, border: 'none', borderRadius: '8px', padding: '0.5rem', minHeight: 'unset', fontSize: '0.85rem', fontWeight: 600 }}
                      onClick={() => setHistCargaMode('masiva')}
                    >
                      Carga Masiva (Excel)
                    </button>
                  </div>

                  {histCargaMode === 'individual' ? (
                    <form onSubmit={handleAdminHistSubmit}>
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label>Seleccionar Producto / Sabor</label>
                        {adminHistForm.producto_id ? (
                          <div 
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.8rem 1rem',
                              background: 'hsla(24, 85%, 55%, 0.08)',
                              border: '1px solid hsla(24, 85%, 55%, 0.2)',
                              borderRadius: '10px',
                              marginTop: '0.2rem'
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                                Helado Seleccionado
                              </span>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                                {productos.find(p => p.id === parseInt(adminHistForm.producto_id)) 
                                  ? getProductOptionLabel(productos.find(p => p.id === parseInt(adminHistForm.producto_id)))
                                  : 'Cargando...'}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '8px' }}>
                                ({productos.find(p => p.id === parseInt(adminHistForm.producto_id)) 
                                  ? formatTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)
                                  : ''})
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                borderColor: 'var(--danger)',
                                color: 'var(--danger)',
                                background: 'transparent'
                              }}
                              onClick={() => {
                                setAdminHistForm({
                                  ...adminHistForm,
                                  producto_id: ''
                                });
                                setAdminHistWeights([]);
                              }}
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="🔍 Buscar helado por nombre..."
                              value={adminHistSearch}
                              onChange={e => setAdminHistSearch(e.target.value)}
                              style={{
                                marginBottom: '0.4rem',
                                padding: '0.8rem 1.2rem',
                                fontSize: '1.05rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-dark)',
                                width: '100%'
                              }}
                            />
                            {(() => {
                              const matchedProducts = productos.filter(p => {
                                if (p.categoria !== 'helados') return false;
                                if (!adminHistSearch) return true;
                                const searchLower = adminHistSearch.toLowerCase();
                                return (
                                  p.nombre.toLowerCase().includes(searchLower) ||
                                  (p.tipo && formatTipo(p.tipo).toLowerCase().includes(searchLower))
                                );
                              });

                              return matchedProducts.length > 0 ? (
                                <div 
                                  style={{
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    borderRadius: '10px',
                                    background: 'white',
                                    marginTop: '0.2rem',
                                    boxShadow: 'var(--shadow-sm)'
                                  }}
                                >
                                  {matchedProducts.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        const isVasqueta = p.categoria === 'helados' && p.tipo === 'vasqueta_5_6k';
                                        setAdminHistForm({
                                          ...adminHistForm,
                                          producto_id: String(p.id),
                                          cantidad: '',
                                          es_evento: isVasqueta ? false : adminHistForm.es_evento
                                        });
                                        setAdminHistWeights([]);
                                        setAdminHistSearch('');
                                      }}
                                      style={{
                                        padding: '0.75rem 1rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                        transition: 'background-color 0.2s',
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsl(210, 20%, 95%)'}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{p.nombre}</span>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                        {formatTipo(p.tipo)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-light)', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', marginTop: '0.2rem' }}>
                                  No se encontraron helados
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Fecha de Fabricación Histórica</label>
                        <input
                          type="date"
                          className="form-control"
                          value={adminHistForm.fecha}
                          onChange={e => setAdminHistForm({ ...adminHistForm, fecha: e.target.value })}
                          required
                        />
                      </div>

                      {/* Event Checkbox */}
                      {(() => {
                        const selectedProd = productos.find(p => p.id === parseInt(adminHistForm.producto_id));
                        const isVasqueta = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
                        if (!selectedProd || isVasqueta) return null;
                        return (
                          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.8rem 0' }}>
                            <input
                              type="checkbox"
                              id="adminHistEsEvento"
                              checked={adminHistForm.es_evento}
                              onChange={e => setAdminHistForm({ ...adminHistForm, es_evento: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="adminHistEsEvento" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                              Destinar a Stock de Eventos (Separado del stock inicial)
                            </label>
                          </div>
                        );
                      })()}

                      <div className="form-group">
                        <label>Cantidad Fabricada</label>
                        <UnitCalculatorInput
                          value={adminHistForm.cantidad}
                          onChange={val => {
                            setAdminHistForm({ ...adminHistForm, cantidad: val });
                            const qty = parseInt(val) || 0;
                            setAdminHistWeights(prev => {
                              const next = [...prev];
                              if (next.length < qty) {
                                while (next.length < qty) next.push(adminHistDefaultWeight || '');
                              } else if (next.length > qty) {
                                next.splice(qty);
                              }
                              return next;
                            });
                          }}
                          product={productos.find(p => p.id === parseInt(adminHistForm.producto_id))}
                          placeholder="Ej. 5"
                          min={1}
                        />
                      </div>

                      {/* Weight Inputs for Helado */}
                      {productos.find(p => p.id === parseInt(adminHistForm.producto_id)) && parseInt(adminHistForm.cantidad) > 0 && (
                        <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                            Pesos Individuales (Balanza)
                          </h4>
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                            Envase: <strong style={{ color: 'var(--text-dark)' }}>{formatTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{ color: 'var(--text-dark)' }}>{getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo).toFixed(3)} kg</strong>
                          </div>

                          {/* Autofill helper input for bulk entry */}
                          <div className="form-group" style={{ marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                              Autocompletar Peso Bruto Unitario (kg)
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                className="form-control"
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                placeholder="Ej. 6.120"
                                value={adminHistDefaultWeight}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAdminHistDefaultWeight(val);
                                  if (val) {
                                    const qty = parseInt(adminHistForm.cantidad) || 0;
                                    setAdminHistWeights(Array(qty).fill(val));
                                  }
                                }}
                              />
                              {adminHistDefaultWeight && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', height: 'auto', whiteSpace: 'nowrap', minHeight: 'unset', background: 'rgba(255,255,255,0.1)', color: 'var(--text)' }}
                                  onClick={() => {
                                    setAdminHistDefaultWeight('');
                                    setAdminHistWeights(Array(parseInt(adminHistForm.cantidad) || 0).fill(''));
                                  }}
                                >
                                  Limpiar
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
                              Ingresa un peso bruto aquí para rellenar automáticamente todas las unidades y evitar cargarlas una por una.
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                            {adminHistWeights.map((w, idx) => {
                              const tare = getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo);
                              const gross = parseFloat(w) || 0;
                              const net = Math.max(0, gross - tare);

                              return (
                                <div key={idx} className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'block' }}># {idx + 1} (Peso Bruto)</label>
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    required
                                    className="form-control"
                                    style={{ padding: '0.3rem', fontSize: '0.85rem' }}
                                    value={w}
                                    onChange={e => {
                                      const next = [...adminHistWeights];
                                      next[idx] = e.target.value;
                                      setAdminHistWeights(next);
                                    }}
                                    placeholder="kg"
                                  />
                                  <div style={{ fontSize: '0.7rem', color: net > 0 ? 'var(--success)' : 'var(--text-light)', marginTop: '2px', textAlign: 'right' }}>
                                    Neto: {net.toFixed(3)} kg
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span><strong>Total Bruto:</strong> {(adminHistWeights.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0)).toFixed(3)} kg</span>
                            <span><strong>Total Neto:</strong> {(adminHistWeights.reduce((acc, curr) => acc + Math.max(0, (parseFloat(curr) || 0) - getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)), 0)).toFixed(3)} kg</span>
                          </div>
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading || !adminHistForm.producto_id}>
                        Cargar Producción Pre-Sistema
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                          1. Descargar Plantilla por Categoría
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.8rem' }}>
                          Selecciona una categoría para generar una plantilla CSV precargada con todos sus productos activos.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                          <select 
                            className="form-control"
                            value={histBulkCategory}
                            onChange={e => setHistBulkCategory(e.target.value)}
                            style={{
                              borderRadius: '10px',
                              background: 'var(--input-bg)',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              color: 'var(--text-dark)',
                              fontSize: '0.95rem',
                              flex: 1,
                              padding: '0.5rem',
                              height: 'auto',
                              minHeight: 'unset'
                            }}
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleDownloadHistTemplate}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '10px',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                              height: 'auto',
                              minHeight: 'unset'
                            }}
                          >
                            📥 Descargar
                          </button>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '1.2rem', marginTop: '0.4rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                          2. Subir Planilla Completada
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1rem', lineHeight: '1.4' }}>
                          Sube la planilla completada en formato CSV. Las filas con cantidad mayor a 0 se registrarán como lotes de producción histórica.
                          <br />
                          💡 <strong>Múltiples pesos de helados:</strong> Si la cantidad es mayor a 1, puedes indicar los pesos brutos individuales separados por espacios, barras o punto y coma (ej: <code>8,120; 8,250; 8,180</code>) en la columna de peso unitario.
                        </p>
                        
                        <div 
                          style={{
                            border: '2px dashed hsl(24, 85%, 55%)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'center',
                            background: 'hsla(24, 85%, 55%, 0.02)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'var(--transition)'
                          }}
                        >
                          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block' }}>
                            {loading ? 'Procesando planilla...' : 'Haga clic para seleccionar el archivo CSV'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                            Formatos aceptados: .csv (delimitado por coma o punto y coma)
                          </span>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleUploadHistTemplate}
                            disabled={loading}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Lotes Cargados Históricamente</h3>
                  <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Cant.</th>
                          <th>Fecha Fabricación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes
                          .filter(l => l.productos && l.productos.categoria === 'helados')
                          .map(l => {
                            const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
                            const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;

                            return (
                              <tr key={l.id}>
                                <td><code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>{l.codigo_lote}</code></td>
                                <td>
                                  <strong>{l.productos?.nombre}</strong>
                                  {l.pesos && l.pesos.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                      Pesos: {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                      <br />
                                      Neto total: <strong style={{ color: 'var(--success)' }}>{netKilos.toFixed(2)} kg</strong>
                                    </div>
                                  )}
                                </td>
                                <td><strong>{formatQuantity(l.cantidad, l.productos)}</strong></td>
                                <td style={{ fontSize: '0.8rem' }}>{new Date(l.fecha_produccion).toLocaleDateString()}</td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maquinas' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      className={`tab-btn ${maintenanceSubTab === 'inventario' ? 'active' : ''}`}
                      style={{ border: 'none', padding: '0.4rem 1.2rem', fontSize: '0.95rem', minHeight: 'unset' }}
                      onClick={() => setMaintenanceSubTab('inventario')}
                    >
                      📋 Inventario de Equipos
                    </button>
                    <button
                      className={`tab-btn ${maintenanceSubTab === 'mantenimiento' ? 'active' : ''}`}
                      style={{ border: 'none', padding: '0.4rem 1.2rem', fontSize: '0.95rem', minHeight: 'unset' }}
                      onClick={() => setMaintenanceSubTab('mantenimiento')}
                    >
                      🔧 Mantenimientos y Alertas
                    </button>
                  </div>

                  {maintenanceSubTab === 'inventario' ? (
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingMaquina(null); setMaquinaForm({ nombre: '', tipo_equipo: 'licuadora_horno_batidora_micro', sucursal_id: sucursales.length > 0 ? sucursales[0].id : '', marca: '', modelo: '', numero_serie: '', fecha_adquisicion: '', estado: 'activo', descripcion: '' }); setShowMaquinaModal(true); }}>
                      ➕ Registrar Equipo
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingMaintenance(null); setMaintenanceForm({ maquina_id: maquinas.length > 0 ? maquinas[0].id : '', fecha: getLocalDateString(), tipo: maquinas.length > 0 ? getMaintenanceOptionsForMachine(maquinas[0].id)[0].value : 'revision_tecnica', descripcion: '', cambio_repuesto: false, repuesto_detalle: '', costo: '', realizado_por: '', proxima_fecha: '' }); setShowMaintenanceModal(true); }}>
                      ➕ Registrar Mantenimiento
                    </button>
                  )}
                </div>

                 {maintenanceSubTab === 'inventario' && (
                  <div>
                    {/* Filtros */}
                    <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Buscar por Nombre / Marca / N/S</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="🔍 Buscar equipo..."
                          value={adminMaquinaSearch}
                          onChange={e => setAdminMaquinaSearch(e.target.value)}
                          style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'var(--text)',
                            fontSize: '0.95rem',
                            height: 'auto',
                            minHeight: 'unset'
                          }}
                        />
                      </div>

                      <div style={{ flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Filtrar por Sucursal</span>
                        <select className="form-control" value={selectedSucursalFilter} onChange={e => setSelectedSucursalFilter(e.target.value)}>
                          <option value="Todos">Todas las sucursales</option>
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Filtrar por Tipo de Equipo</span>
                        <select className="form-control" value={selectedTipoEquipoFilter} onChange={e => setSelectedTipoEquipoFilter(e.target.value)}>
                          <option value="Todos">Todos los tipos</option>
                          <option value="licuadora_horno_batidora_micro">Licuadoras / Hornos / Batidoras / Microondas</option>
                          <option value="maquina_helado">Máquinas de Helado</option>
                          <option value="frio_abatidor_heladera_camara">Abatidores / Heladeras / Cámaras (Frío)</option>
                          <option value="aire_acondicionado">Aires Acondicionados</option>
                          <option value="otro">Otros Equipos</option>
                        </select>
                      </div>
                    </div>

                    {/* Grilla de Equipos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
                      {maquinas
                        .filter(m => selectedSucursalFilter === 'Todos' || m.sucursal_id === parseInt(selectedSucursalFilter))
                        .filter(m => selectedTipoEquipoFilter === 'Todos' || m.tipo_equipo === selectedTipoEquipoFilter)
                        .filter(m => {
                          if (!adminMaquinaSearch) return true;
                          const q = adminMaquinaSearch.toLowerCase();
                          return (
                            m.nombre.toLowerCase().includes(q) ||
                            (m.marca && m.marca.toLowerCase().includes(q)) ||
                            (m.modelo && m.modelo.toLowerCase().includes(q)) ||
                            (m.numero_serie && m.numero_serie.toLowerCase().includes(q)) ||
                            (m.sucursal_nombre && m.sucursal_nombre.toLowerCase().includes(q))
                          );
                        })
                        .map(m => {
                          const icon = getEquipoIcon(m.tipo_equipo);
                          const stateColors = {
                            activo: { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--success)' },
                            inactiva: { bg: 'rgba(107, 114, 128, 0.15)', text: 'var(--text-light)' },
                            inactivo: { bg: 'rgba(107, 114, 128, 0.15)', text: 'var(--text-light)' },
                            en_mantenimiento: { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--warning)' },
                            de_baja: { bg: 'rgba(239, 68, 68, 0.15)', text: 'var(--danger)' }
                          };
                          const stColor = stateColors[m.estado] || { bg: 'rgba(0,0,0,0.05)', text: 'var(--text-dark)' };

                          return (
                            <div key={m.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', position: 'relative' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                  <div style={{ fontSize: '1.8rem' }}>{icon}</div>
                                  <span style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    backgroundColor: stColor.bg,
                                    color: stColor.text
                                  }}>
                                    {m.estado.replace('_', ' ')}
                                  </span>
                                </div>

                                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', fontFamily: 'Outfit', color: 'var(--text-dark)' }}>{m.nombre}</h4>
                                <div style={{ display: 'inline-block', backgroundColor: 'rgba(24, 144, 255, 0.08)', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', marginBottom: '0.8rem' }}>
                                  📍 {m.sucursal_nombre}
                                </div>

                                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-light)', marginBottom: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.6rem' }}>
                                  <span><strong>Tipo:</strong> {getEquipoTypeLabel(m.tipo_equipo)}</span>
                                  {m.marca && <span><strong>Marca:</strong> {m.marca}</span>}
                                  {m.modelo && <span><strong>Modelo:</strong> {m.modelo}</span>}
                                  {m.numero_serie && <span><strong>N/S:</strong> {m.numero_serie}</span>}
                                  {m.fecha_adquisicion && <span><strong>Adquisición:</strong> {new Date(m.fecha_adquisicion).toLocaleDateString()}</span>}
                                </div>

                                {m.descripcion && (
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '1rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                                    "{m.descripcion}"
                                  </p>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.8rem' }}>
                                <button className="btn btn-outline btn-sm" style={{ flex: 1, padding: '0.35rem' }} onClick={() => {
                                  setMaintenanceForm({
                                    maquina_id: m.id,
                                    fecha: getLocalDateString(),
                                    tipo: getMaintenanceOptionsForMachine(m.id)[0].value,
                                    descripcion: '',
                                    cambio_repuesto: false,
                                    repuesto_detalle: '',
                                    costo: '',
                                    realizado_por: '',
                                    proxima_fecha: ''
                                  });
                                  setMaintenanceSubTab('mantenimiento');
                                  setShowMaintenanceModal(true);
                                }}>
                                  🔧 Mantener
                                </button>
                                <button className="btn btn-outline btn-sm" style={{ padding: '0.35rem 0.6rem', borderColor: 'rgba(0,0,0,0.1)' }} onClick={() => handleEditMaquina(m)} title="Editar Equipo">
                                  ✏️
                                </button>
                                <button className="btn btn-outline btn-sm" style={{ padding: '0.35rem 0.6rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDeleteMaquina(m.id)} title="Eliminar Equipo">
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      {maquinas
                        .filter(m => selectedSucursalFilter === 'Todos' || m.sucursal_id === parseInt(selectedSucursalFilter))
                        .filter(m => selectedTipoEquipoFilter === 'Todos' || m.tipo_equipo === selectedTipoEquipoFilter)
                        .filter(m => {
                          if (!adminMaquinaSearch) return true;
                          const q = adminMaquinaSearch.toLowerCase();
                          return (
                            m.nombre.toLowerCase().includes(q) ||
                            (m.marca && m.marca.toLowerCase().includes(q)) ||
                            (m.modelo && m.modelo.toLowerCase().includes(q)) ||
                            (m.numero_serie && m.numero_serie.toLowerCase().includes(q)) ||
                            (m.sucursal_nombre && m.sucursal_nombre.toLowerCase().includes(q))
                          );
                        }).length === 0 && (
                          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-light)', width: '100%' }}>
                            No se encontraron equipos registrados.
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {maintenanceSubTab === 'mantenimiento' && (
                  <div>
                    {/* Alertas */}
                    <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
                      <h4 className="section-title" style={{ border: 'none', margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>
                        🚨 Control de Mantenimientos Vencidos o Próximos
                      </h4>
                      {(() => {
                        const alerts = getMaintenanceAlerts();
                        if (alerts.length === 0) {
                          return (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>✅</span>
                              <span>Todos los equipos se encuentran al día. No hay mantenimientos programados vencidos ni próximos en los siguientes 30 días.</span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {alerts.map(al => (
                              <div key={al.id} style={{
                                padding: '0.8rem 1rem',
                                borderRadius: '8px',
                                background: al.estado === 'vencido' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                border: `1px solid ${al.estado === 'vencido' ? 'var(--danger)' : 'var(--warning)'}`,
                                color: al.estado === 'vencido' ? 'hsl(354, 70%, 30%)' : 'hsl(38, 92%, 30%)',
                                fontSize: '0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <div>
                                  <strong>{al.estado === 'vencido' ? '🔴 VENCIDO' : '🟡 PRÓXIMO'}</strong>: El equipo{' '}
                                  <strong>{al.maquina?.nombre}</strong> ({al.maquina?.sucursal_nombre}) requiere{' '}
                                  <strong>{getMaintenanceTypeLabel(al.tipo_mantenimiento)}</strong>.{' '}
                                  {al.estado === 'vencido' ? (
                                    <span>Venció hace {al.dias} días</span>
                                  ) : (
                                    <span>Vence en {al.dias} días</span>
                                  )}{' '}
                                  (Fecha límite: {new Date(al.proxima_fecha).toLocaleDateString()}).
                                </div>
                                <button className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', minHeight: 'unset', background: al.estado === 'vencido' ? 'var(--danger)' : 'var(--warning)', color: 'white', border: 'none' }} onClick={() => {
                                  setMaintenanceForm({
                                    maquina_id: al.maquina.id,
                                    fecha: getLocalDateString(),
                                    tipo: al.tipo_mantenimiento,
                                    descripcion: '',
                                    cambio_repuesto: false,
                                    repuesto_detalle: '',
                                    costo: '',
                                    realizado_por: '',
                                    proxima_fecha: ''
                                  });
                                  setShowMaintenanceModal(true);
                                }}>
                                  Realizar Mantenimiento
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Historial */}
                    <div className="glass-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h4 className="section-title" style={{ border: 'none', margin: 0, fontSize: '1.1rem', color: 'var(--text-dark)' }}>
                          📋 Historial de Trabajos Realizados
                        </h4>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Buscar:</span>
                            <input
                              type="text"
                              className="form-control search-control-responsive"
                              placeholder="🔍 Buscar trabajo..."
                              value={adminMantenimientoSearch}
                              onChange={e => setAdminMantenimientoSearch(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Filtrar por Máquina:</span>
                            <select className="form-control" style={{ width: '220px', maxWidth: '100%', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--input-bg)', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-dark)' }} value={selectedMaquinaFilter} onChange={e => setSelectedMaquinaFilter(e.target.value)}>
                              <option value="Todos">Todas las máquinas</option>
                              {maquinas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre} ({m.sucursal_nombre})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Equipo</th>
                              <th>Tipo</th>
                              <th>Descripción / Diagnóstico</th>
                              <th>Costo</th>
                              <th>Realizado Por</th>
                              <th>Próximo Control</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mantenimientos
                              .filter(m => selectedMaquinaFilter === 'Todos' || m.maquina_id === parseInt(selectedMaquinaFilter))
                              .filter(m => {
                                if (!adminMantenimientoSearch) return true;
                                const q = adminMantenimientoSearch.toLowerCase();
                                return (
                                  (m.maquina_nombre && m.maquina_nombre.toLowerCase().includes(q)) ||
                                  (m.descripcion && m.descripcion.toLowerCase().includes(q)) ||
                                  (m.realizado_por && m.realizado_por.toLowerCase().includes(q)) ||
                                  (m.tipo && getMaintenanceTypeLabel(m.tipo).toLowerCase().includes(q))
                                );
                              })
                              .map(m => (
                                <tr key={m.id}>
                                  <td><strong>{new Date(m.fecha).toLocaleDateString()}</strong></td>
                                  <td>
                                    <strong>{m.maquina_nombre}</strong>
                                    {m.maquina_marca && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{m.maquina_marca} {m.maquina_modelo}</div>}
                                  </td>
                                  <td style={{ fontSize: '0.85rem' }}>{getMainMaintenanceTypeLabel(m.tipo)}</td>
                                  <td>
                                    <div style={{ fontSize: '0.9rem' }}>{m.descripcion}</div>
                                    {m.cambio_repuesto && (
                                      <div style={{ marginTop: '4px' }}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          backgroundColor: 'rgba(24, 144, 255, 0.08)',
                                          border: '1px dashed var(--secondary)',
                                          borderRadius: '4px',
                                          color: 'var(--secondary)',
                                          fontSize: '0.75rem',
                                          padding: '0.15rem 0.4rem',
                                          fontWeight: 600
                                        }}>
                                          🔧 Repuesto: {m.repuesto_detalle || 'Detalle no provisto'}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{m.costo > 0 ? `$ ${parseFloat(m.costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                                  <td style={{ fontSize: '0.85rem' }}>{m.realizado_por || '-'}</td>
                                  <td style={{ fontSize: '0.85rem' }}>
                                    {m.proxima_fecha ? (
                                      <span style={{
                                        color: new Date(m.proxima_fecha) < new Date(getLocalDateString()) ? 'var(--danger)' : 'var(--text-dark)',
                                        fontWeight: new Date(m.proxima_fecha) < new Date(getLocalDateString()) ? 700 : 500
                                      }}>
                                        {new Date(m.proxima_fecha).toLocaleDateString()}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                      <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.4rem', fontSize: '0.8rem' }} onClick={() => handleEditMaintenance(m)} title="Editar Registro">
                                        ✏️
                                      </button>
                                      <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.4rem', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDeleteMaintenance(m.id)} title="Eliminar Registro">
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            {mantenimientos
                              .filter(m => selectedMaquinaFilter === 'Todos' || m.maquina_id === parseInt(selectedMaquinaFilter))
                              .filter(m => {
                                if (!adminMantenimientoSearch) return true;
                                const q = adminMantenimientoSearch.toLowerCase();
                                return (
                                  (m.maquina_nombre && m.maquina_nombre.toLowerCase().includes(q)) ||
                                  (m.descripcion && m.descripcion.toLowerCase().includes(q)) ||
                                  (m.realizado_por && m.realizado_por.toLowerCase().includes(q)) ||
                                  (m.tipo && getMaintenanceTypeLabel(m.tipo).toLowerCase().includes(q))
                                );
                              }).length === 0 && (
                                <tr>
                                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                                    No hay registros de mantenimiento para esta selección.
                                  </td>
                                </tr>
                              )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'proveedores' && (
              <div className="glass-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Gestión de Proveedores</h3>
                  <button className="btn btn-primary" onClick={() => {
                    setEditingProv(null);
                    setProvForm({ nombre: '', cuit: '', telefono: '', direccion: '', email: '' });
                    setShowProvModal(true);
                  }}>
                    ➕ Nuevo Proveedor
                  </button>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>CUIT</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proveedores.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td><strong>{p.nombre}</strong></td>
                          <td>{p.cuit || '-'}</td>
                          <td>{p.telefono || '-'}</td>
                          <td>{p.email || '-'}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => {
                              setEditingProv(p);
                              setProvForm({
                                nombre: p.nombre,
                                cuit: p.cuit || '',
                                telefono: p.telefono || '',
                                direccion: p.direccion || '',
                                email: p.email || ''
                              });
                              setShowProvModal(true);
                            }}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleProvDelete(p.id, p.nombre)}>
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {proveedores.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                            No hay proveedores registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PROVEEDOR MODAL */}
                {showProvModal && (
                  <div className="modal-overlay" onClick={() => setShowProvModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                      <h3 className="section-title" style={{ marginTop: 0 }}>
                        {editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                      </h3>
                      <form onSubmit={handleProvSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                          <label>Nombre *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={provForm.nombre}
                            onChange={e => setProvForm({ ...provForm, nombre: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>CUIT (Opcional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={provForm.cuit}
                            onChange={e => setProvForm({ ...provForm, cuit: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Teléfono (Opcional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={provForm.telefono}
                            onChange={e => setProvForm({ ...provForm, telefono: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email (Opcional)</label>
                          <input
                            type="email"
                            className="form-control"
                            value={provForm.email}
                            onChange={e => setProvForm({ ...provForm, email: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Dirección (Opcional)</label>
                          <textarea
                            className="form-control"
                            value={provForm.direccion}
                            onChange={e => setProvForm({ ...provForm, direccion: e.target.value })}
                            rows="2"
                          ></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProvModal(false)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= HELADERO / PASTELERO VIEW ================= */}
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

            {activeTab === 'produccion' && (
              <div className="dashboard-grid">
                <div className="glass-card">
                  <h3 className="section-title">
                    {user.rol === 'heladero' ? 'Registro de Fabricación' : user.rol === 'pastelero_helado' ? 'Registro de Pastelería Helada' : 'Registro de Pastelería'}
                  </h3>
                  <form onSubmit={handleProductionSubmit}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Seleccionar Producto / Sabor</label>
                      <input type="hidden" name="producto_id" value={prodForm.producto_id} required />
                      {prodForm.producto_id ? (
                        <div 
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.8rem 1rem',
                            background: 'hsla(24, 85%, 55%, 0.08)',
                            border: '1px solid hsla(24, 85%, 55%, 0.2)',
                            borderRadius: '10px',
                            marginTop: '0.2rem'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                              Producto Seleccionado
                            </span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                              {productos.find(p => p.id === parseInt(prodForm.producto_id)) 
                                ? getProductOptionLabel(productos.find(p => p.id === parseInt(prodForm.producto_id)))
                                : 'Cargando...'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '8px' }}>
                              ({productos.find(p => p.id === parseInt(prodForm.producto_id)) 
                                ? formatTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)
                                : ''})
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              borderColor: 'var(--danger)',
                              color: 'var(--danger)',
                              background: 'transparent'
                            }}
                            onClick={() => {
                              setProdForm({
                                ...prodForm,
                                producto_id: ''
                              });
                              setProdWeights([]);
                            }}
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="🔍 Buscar producto por nombre..."
                            value={prodFormSearch}
                            onChange={e => setProdFormSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                            style={{
                              marginBottom: '0.4rem',
                              padding: '0.8rem 1.2rem',
                              fontSize: '1.05rem',
                              borderRadius: '12px',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-dark)',
                              width: '100%'
                            }}
                          />
                          {(() => {
                            const matchedProducts = productos.filter(p => {
                              if (!isCategoryVisibleToRole(p.categoria, user.rol)) return false;
                              if (!prodFormSearch) return true;
                              const searchLower = prodFormSearch.toLowerCase();
                              return (
                                p.nombre.toLowerCase().includes(searchLower) ||
                                (p.tipo && formatTipo(p.tipo).toLowerCase().includes(searchLower))
                              );
                            });

                            return matchedProducts.length > 0 ? (
                              <div 
                                style={{
                                  maxHeight: '220px',
                                  overflowY: 'auto',
                                  border: '1px solid rgba(0, 0, 0, 0.1)',
                                  borderRadius: '10px',
                                  background: 'white',
                                  marginTop: '0.2rem',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                {matchedProducts.map(p => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      const isVasqueta = p.categoria === 'helados' && p.tipo === 'vasqueta_5_6k';
                                      setProdForm({
                                        ...prodForm,
                                        producto_id: String(p.id),
                                        cantidad: '',
                                        es_evento: isVasqueta ? false : prodForm.es_evento
                                      });
                                      setProdWeights([]);
                                      setProdFormSearch('');
                                    }}
                                    style={{
                                      padding: '0.75rem 1rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                      transition: 'background-color 0.2s',
                                      fontSize: '0.95rem',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <div>
                                      <strong style={{ color: 'var(--text-dark)' }}>{p.nombre}</strong>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '8px' }}>
                                        ({formatTipo(p.tipo)})
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                                      {p.categoria.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ padding: '0.75rem 1rem', color: 'var(--text-light)', fontSize: '0.9rem', textAlign: 'center' }}>
                                No se encontraron productos.
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Fecha de Fabricación</label>
                      <input
                        type="date"
                        className="form-control"
                        value={prodForm.fecha}
                        onChange={e => setProdForm({ ...prodForm, fecha: e.target.value })}
                        required
                      />
                    </div>

                    {/* Event Checkbox */}
                    {(() => {
                      const selectedProd = productos.find(p => p.id === parseInt(prodForm.producto_id));
                      const isVasqueta = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
                      if (!selectedProd || isVasqueta) return null;
                      return (
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.8rem 0' }}>
                          <input
                            type="checkbox"
                            id="prodEsEvento"
                            checked={prodForm.es_evento}
                            onChange={e => setProdForm({ ...prodForm, es_evento: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label htmlFor="prodEsEvento" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                            Destinar a Stock de Eventos (Separado del stock inicial)
                          </label>
                        </div>
                      );
                    })()}
                    <div className="form-group">
                      <label>Cantidad Fabricada</label>
                      <UnitCalculatorInput
                        value={prodForm.cantidad}
                        onChange={val => {
                          setProdForm({ ...prodForm, cantidad: val });
                          const qty = parseInt(val) || 0;
                          setProdWeights(prev => {
                            const next = [...prev];
                            if (next.length < qty) {
                              while (next.length < qty) next.push('');
                            } else if (next.length > qty) {
                              next.splice(qty);
                            }
                            return next;
                          });
                        }}
                        product={productos.find(p => p.id === parseInt(prodForm.producto_id))}
                        placeholder="Ej. 5"
                        min={1}
                      />
                    </div>

                    {/* Weight Inputs for Helado */}
                    {productos.find(p => p.id === parseInt(prodForm.producto_id))?.categoria === 'helados' && parseInt(prodForm.cantidad) > 0 && (
                      <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                          Pesos Individuales (Balanza)
                        </h4>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                          Envase: <strong style={{ color: 'var(--text-dark)' }}>{formatTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{ color: 'var(--text-dark)' }}>{getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo).toFixed(3)} kg</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {prodWeights.map((w, idx) => {
                            const tare = getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo);
                            const gross = parseFloat(w) || 0;
                            const net = Math.max(0, gross - tare);

                            return (
                              <div key={idx} className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'block' }}># {idx + 1} (Peso Bruto)</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  required
                                  className="form-control"
                                  style={{ padding: '0.3rem', fontSize: '0.85rem' }}
                                  value={w}
                                  onChange={e => {
                                    const next = [...prodWeights];
                                    next[idx] = e.target.value;
                                    setProdWeights(next);
                                  }}
                                  placeholder="kg"
                                />
                                <div style={{ fontSize: '0.7rem', color: net > 0 ? 'var(--success)' : 'var(--text-light)', marginTop: '2px', textAlign: 'right' }}>
                                  Neto: {net.toFixed(3)} kg
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>Total Bruto:</strong> {(prodWeights.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0)).toFixed(3)} kg</span>
                          <span><strong>Total Neto:</strong> {(prodWeights.reduce((acc, curr) => acc + Math.max(0, (parseFloat(curr) || 0) - getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)), 0)).toFixed(3)} kg</span>
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                      Registrar Entrada y Auto-Lote
                    </button>
                  </form>
                </div>

                <div className="glass-card">
                  <h3 className="section-title">Producción Reciente (Lotes)</h3>
                  <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Producto / Sabor</th>
                          <th>Cant.</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLotes
                          .filter(l => l.productos && isCategoryVisibleToRole(l.productos.categoria, user.rol))
                          .map(l => {
                            const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
                            const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;

                            return (
                              <tr key={l.id}>
                                <td><code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>{l.codigo_lote}</code></td>
                                <td>
                                  <strong>{l.productos?.nombre}</strong>
                                  {l.pesos && l.pesos.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                      Pesos: {l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')}
                                      <br />
                                      Neto total: <strong style={{ color: 'var(--success)' }}>{netKilos.toFixed(2)} kg</strong>
                                    </div>
                                  )}
                                </td>
                                <td><strong>{formatQuantity(l.cantidad, l.productos)}</strong></td>
                                <td style={{ fontSize: '0.8rem' }}>{new Date(l.fecha_produccion).toLocaleDateString()}</td>
                              </tr>
                            );
                          })
                        }
                        {recentLotes.filter(l => l.productos && isCategoryVisibleToRole(l.productos.categoria, user.rol)).length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                              No hay producciones registradas recientemente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Stock Actual en Fábrica (Depósito Principal)</h3>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      className={`btn btn-sm ${!showEventStock ? 'btn-primary' : 'btn-outline'}`}
                      style={{ border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', minHeight: 'unset' }}
                      onClick={() => setShowEventStock(false)}
                    >
                      📦 Stock Común
                    </button>
                    <button
                      className={`btn btn-sm ${showEventStock ? 'btn-primary' : 'btn-outline'}`}
                      style={{ border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', minHeight: 'unset' }}
                      onClick={() => setShowEventStock(true)}
                    >
                      🎉 Stock de Eventos
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar sabor/producto:</span>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por nombre..."
                    value={factoryStockSearch}
                    onChange={e => setFactoryStockSearch(e.target.value)}
                  />
                </div>

                {user.rol === 'heladero' ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginRight: '0.5rem' }}>Formato:</span>
                        {[
                          { id: 'Todos', label: 'Todos' },
                          { id: 'Vasqueta', label: 'Vasquetas' },
                          { id: 'Balde', label: 'Baldes' }
                        ].map(fmt => (
                          <button
                            key={fmt.id}
                            className={`btn btn-sm ${iceCreamFormatFilter === fmt.id ? 'btn-primary' : 'btn-outline'}`}
                            style={{ borderRadius: '8px', padding: '0.4rem 0.8rem', fontWeight: 600 }}
                            onClick={() => setIceCreamFormatFilter(fmt.id)}
                          >
                            {fmt.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginRight: '0.5rem' }}>Categoría:</span>
                        {['Todos', 'Dulces de leche', 'Chocolate', 'Cremas', 'Sin gluten', 'Frutales al agua'].map(group => (
                          <button
                            key={group}
                            className={`btn btn-sm ${stockGroupFilter === group ? 'btn-primary' : 'btn-outline'}`}
                            style={{ borderRadius: '8px', padding: '0.4rem 0.8rem', fontWeight: 600 }}
                            onClick={() => setStockGroupFilter(group)}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sabor / Helado</th>
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta') && (
                              <th style={{ textAlign: 'center' }}>Vasqueta</th>
                            )}
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && (
                              <th style={{ textAlign: 'center' }}>Balde 5L</th>
                            )}
                            {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && (
                              <th style={{ textAlign: 'center' }}>Balde 10L</th>
                            )}
                            <th>Kilos Netos Totales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const groupedStock = getGroupedStock(showEventStock);
                            let filteredStock = groupedStock.filter(s => stockGroupFilter === 'Todos' || s.group === stockGroupFilter);
                            if (factoryStockSearch) {
                              filteredStock = filteredStock.filter(s => 
                                s.flavor.toLowerCase().includes(factoryStockSearch.toLowerCase()) ||
                                s.group.toLowerCase().includes(factoryStockSearch.toLowerCase())
                              );
                            }

                            if (filteredStock.length === 0) {
                              const dynamicColSpan = iceCreamFormatFilter === 'Todos' ? 5 : iceCreamFormatFilter === 'Vasqueta' ? 3 : 4;
                              return (
                                <tr>
                                  <td colSpan={dynamicColSpan} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                    No hay productos en esta categoría con stock en Fábrica.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredStock.map(s => {
                              const wVasqueta = s.vasqueta_id ? getProductNetWeight(s.vasqueta_id, 'vasqueta_5_6k') : 5.5;
                              const wBalde5l = s.balde_4k_id ? getProductNetWeight(s.balde_4k_id, 'balde_4k') : 4.0;
                              const wBalde10l = s.balde_8k_id ? getProductNetWeight(s.balde_8k_id, 'balde_8k') : 8.0;

                              const totalKilos = 
                                ((iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta') ? (showEventStock ? 0 : (s.vasqueta_qty * wVasqueta)) : 0) +
                                ((iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') ? (s.balde_4k_qty * wBalde5l) + (s.balde_8k_qty * wBalde10l) : 0);

                              return (
                                <tr key={s.flavor}>
                                  <td>
                                    <strong>{s.flavor}</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                      Categoría: <span className="badge badge-solicitado" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>{s.group}</span>
                                    </div>
                                  </td>
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Vasqueta') && (
                                    <td style={{ textAlign: 'center', color: showEventStock ? 'var(--text-light)' : (s.vasqueta_qty > 0 ? 'var(--text)' : 'var(--text-light)') }}>
                                      {showEventStock ? '-' : s.vasqueta_qty}
                                    </td>
                                  )}
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && (
                                    <td style={{ textAlign: 'center', fontWeight: s.balde_4k_qty > 0 ? 700 : 400, color: s.balde_4k_qty > 0 ? 'var(--text)' : 'var(--text-light)' }}>
                                      {s.balde_4k_qty}
                                    </td>
                                  )}
                                  {(iceCreamFormatFilter === 'Todos' || iceCreamFormatFilter === 'Balde') && (
                                    <td style={{ textAlign: 'center', fontWeight: s.balde_8k_qty > 0 ? 700 : 400, color: s.balde_8k_qty > 0 ? 'var(--text)' : 'var(--text-light)' }}>
                                      {s.balde_8k_qty}
                                    </td>
                                  )}
                                  <td>
                                    {totalKilos > 0 ? (
                                      <strong style={{ color: 'var(--success)' }}>{totalKilos.toFixed(2)} kg</strong>
                                    ) : (
                                      <span style={{ color: 'var(--text-light)' }}>0 kg</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto / Sabor</th>
                          <th>Formato</th>
                          <th>Cantidad Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let items = stockData.filter(s => s.sucursal_id === 1 && isCategoryVisibleToRole(s.categoria, user.rol) && s.es_evento === showEventStock);
                          if (factoryStockSearch) {
                            items = items.filter(s => 
                              s.producto_nombre.toLowerCase().includes(factoryStockSearch.toLowerCase()) ||
                              (s.tipo && formatTipo(s.tipo).toLowerCase().includes(factoryStockSearch.toLowerCase()))
                            );
                          }
                          return (
                            <>
                              {items.map(s => (
                                <tr key={s.producto_id}>
                                  <td><strong>{s.producto_nombre}</strong></td>
                                  <td style={{ textTransform: 'capitalize' }}>{formatTipo(s.tipo)}</td>
                                  <td style={{ fontWeight: 700, color: s.cantidad > 5 ? 'var(--success)' : 'var(--danger)' }}>
                                    {formatQuantity(s.cantidad, productos.find(p => p.id === s.producto_id))}
                                  </td>
                                </tr>
                              ))}
                              {items.length === 0 && (
                                <tr>
                                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                    No hay stock registrado en esta sección.
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pedidos_eventos' && user.rol === 'heladero' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Pedidos de Eventos por Preparar</h3>
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
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q))
                          );
                        })
                        .map(order => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.destino_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{new Date(order.fecha_solicitud).toLocaleString()}</td>
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
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q))
                          );
                        }).length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                              No se encontraron pedidos de eventos.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TRANSPORTISTA VIEW ================= */}
        {user.rol === 'transportista' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>Preparar Pedidos</button>
              <button className={`tab-btn ${activeTab === 'rutas' ? 'active' : ''}`} onClick={() => setActiveTab('rutas')}>Mis Viajes y Repartos</button>
              <button className={`tab-btn ${activeTab === 'carga_insumos' ? 'active' : ''}`} onClick={() => setActiveTab('carga_insumos')}>Carga de Productos/Insumos</button>
              <button className={`tab-btn ${activeTab === 'stock_fabrica' ? 'active' : ''}`} onClick={() => setActiveTab('stock_fabrica')}>Stock Fábrica</button>
            </div>

            {activeTab === 'carga_insumos' && (
              <div className="glass-card fade-in">
                <h3 className="section-title">Ingreso de Mercadería a Fábrica</h3>
                <form onSubmit={handleTranspCargaSubmit} className="form-grid">
                  <div className="form-group">
                    <label>Proveedor</label>
                    <select
                      className="form-control"
                      value={transpCargaForm.proveedor_id}
                      onChange={e => setTranspCargaForm({ ...transpCargaForm, proveedor_id: e.target.value, producto_id: '' })}
                      required
                    >
                      <option value="">-- Seleccionar Proveedor --</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Producto / Insumo</label>
                    <select
                      className="form-control"
                      value={transpCargaForm.producto_id}
                      onChange={e => setTranspCargaForm({ ...transpCargaForm, producto_id: e.target.value })}
                      required
                      disabled={!transpCargaForm.proveedor_id}
                    >
                      <option value="">-- Seleccione un producto --</option>
                      {productos
                        .filter(p => p.activo === 1 && p.proveedor_id === parseInt(transpCargaForm.proveedor_id))
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.tipo})
                          </option>
                        ))}
                      {productos.filter(p => p.activo === 1 && p.proveedor_id === parseInt(transpCargaForm.proveedor_id)).length === 0 && transpCargaForm.proveedor_id && (
                         <option value="" disabled>No hay productos registrados para este proveedor</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cantidad ({productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? 'kg' : 'unidades'})</label>
                    <input
                      type="number"
                      className="form-control"
                      min={productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? "0.01" : "1"}
                      step={productos.find(p => p.id === parseInt(transpCargaForm.producto_id))?.unidad_medida === 'peso' ? "0.01" : "1"}
                      value={transpCargaForm.cantidad}
                      onChange={e => setTranspCargaForm({ ...transpCargaForm, cantidad: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Recepción</label>
                    <input
                      type="date"
                      className="form-control"
                      value={transpCargaForm.fecha}
                      onChange={e => setTranspCargaForm({ ...transpCargaForm, fecha: e.target.value })}
                      required
                      max={getLocalDateString()}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !transpCargaForm.producto_id}>
                      {loading ? 'Procesando...' : 'Registrar Ingreso en Fábrica'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'stock_fabrica' && (
              <div className="glass-card fade-in">
                <h3 className="section-title">📦 Stock Actual de Insumos en Fábrica</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                  Consulta el inventario actual de insumos y materias primas en la fábrica.
                </p>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Insumo / Producto</th>
                        <th>Proveedor</th>
                        <th style={{ textAlign: 'center' }}>Stock en Fábrica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos
                        .filter(p => p.activo === 1)
                        .filter(p => user.rol !== 'transportista' || p.categoria === 'termicos' || p.categoria === 'otros')
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                        .map(prod => {
                          const stock = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 1 && !s.es_evento)?.cantidad || 0;
                          return (
                            <tr key={prod.id}>
                              <td><strong>{prod.nombre}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>({formatTipo(prod.tipo)})</span></td>
                              <td>{proveedores.find(prov => prov.id === prod.proveedor_id)?.nombre || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={stock > 0 ? 'matrix-cell-ok' : 'matrix-cell-empty'} style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  display: 'inline-block',
                                  minWidth: '60px'
                                }}>
                                  {formatQuantity(stock, prod)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {productos.filter(p => p.activo === 1).length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>No hay productos registrados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'pedidos' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Pedidos por Preparar para Despacho</h3>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por ID o Destino..."
                    value={driverOrderSearch}
                    onChange={e => setDriverOrderSearch(e.target.value)}
                  />
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
                      {orders
                        .filter(o => o.estado === 'solicitado')
                        .filter(order => {
                          if (!driverOrderSearch) return true;
                          const q = driverOrderSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q))
                          );
                        })
                        .map(order => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.destino_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{new Date(order.fecha_solicitud).toLocaleString()}</td>
                            <td>
                              <button className="btn btn-secondary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                Revisar y Preparar
                              </button>
                            </td>
                          </tr>
                        ))}
                      {orders
                        .filter(o => o.estado === 'solicitado')
                        .filter(order => {
                          if (!driverOrderSearch) return true;
                          const q = driverOrderSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q))
                          );
                        }).length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                              No se encontraron pedidos.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'rutas' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Control de Envíos y Carga</h3>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por ID o Destino..."
                    value={driverRouteSearch}
                    onChange={e => setDriverRouteSearch(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
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
                      {orders
                        .filter(order => order.sucursal_destino_id !== user.sucursal_id)
                        .filter(order => {
                          if (!driverRouteSearch) return true;
                          const q = driverRouteSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q)) ||
                            (order.estado && translateState(order.estado).toLowerCase().includes(q))
                          );
                        })
                        .map(order => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.destino_nombre}</strong></td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{order.fecha_preparacion ? new Date(order.fecha_preparacion).toLocaleString() : '-'}</td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                {order.estado === 'preparado' ? 'Iniciar Carga' : 'Ver y Gestionar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      {orders
                        .filter(order => order.sucursal_destino_id !== user.sucursal_id)
                        .filter(order => {
                          if (!driverRouteSearch) return true;
                          const q = driverRouteSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.destino_nombre && order.destino_nombre.toLowerCase().includes(q)) ||
                            (order.estado && translateState(order.estado).toLowerCase().includes(q))
                          );
                        }).length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                              No se encontraron viajes activos.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SUCURSAL VIEW ================= */}
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

            {activeTab === 'pedido_nuevo' && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ flex: '1 1 60%', minWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Armar Pedido</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(user.rol === 'admin' || user.rol === 'heladero') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <input
                          type="checkbox"
                          id="orderIsEventCheck"
                          checked={orderIsEvent}
                          onChange={e => {
                            setOrderIsEvent(e.target.checked);
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="orderIsEventCheck" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                          🚨 Pedido para EVENTO (Stock de Eventos)
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {pendingItems.length > 0 && (
                  <div className="glass-card" style={{
                    background: 'rgba(255, 171, 0, 0.08)',
                    border: '1px solid rgba(255, 171, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                      <span>⚠️</span> Productos pendientes de envíos anteriores (Falta de Stock)
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 1rem 0' }}>
                      Los siguientes productos no pudieron cargarse por falta de stock. Agrégalos a este nuevo pedido para volver a solicitarlos:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center' }}>
                      {pendingItems.map(p => (
                        <div key={p.producto_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.02)',
                          padding: '0.5rem 0.8rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.06)'
                        }}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>{p.nombre}</strong> <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>({formatTipo(p.tipo)})</span>: <strong style={{ color: 'var(--warning)' }}>{formatQuantity(p.cantidad, productos.find(prod => prod.id === p.producto_id))}</strong>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minHeight: 'unset', height: 'auto', borderRadius: '4px' }}
                            onClick={() => {
                              setOrderItems(prev => ({
                                ...prev,
                                [p.producto_id]: (prev[p.producto_id] || 0) + p.cantidad
                              }));
                            }}
                          >
                            ＋ Agregar
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600 }}
                        onClick={() => {
                          setOrderItems(prev => {
                            const updated = { ...prev };
                            pendingItems.forEach(p => {
                              updated[p.producto_id] = (updated[p.producto_id] || 0) + p.cantidad;
                            });
                            return updated;
                          });
                        }}
                      >
                        ⚡ Agregar Todos
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-tabs and Search Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem', background: 'rgba(0, 0, 0, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="🔍 Buscar producto o sabor..."
                      className="form-control"
                      style={{
                        padding: '0.75rem 1.2rem 0.75rem 2.8rem',
                        borderRadius: '12px',
                        background: 'var(--input-bg)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        color: 'var(--text-dark)',
                        fontSize: '1.05rem',
                        width: '100%'
                      }}
                      value={orderSearchQuery}
                      onChange={e => setOrderSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'helados', label: '🍧 Helados' },
                      { id: 'pasteleria_helada', label: '🍦 Pastelería Helada' },
                      { id: 'pasteleria', label: '🍰 Pastelería Clásica' },
                      { id: 'viennoiserie', label: '🥐 Viennoiserie' },
                      { id: 'termicos', label: '📦 Térmicos' },
                      { id: 'otros', label: '✨ Otros' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        className={`tab-btn ${orderSubTab === tab.id ? 'active' : ''}`}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          fontWeight: orderSubTab === tab.id ? 600 : 400
                        }}
                        onClick={() => {
                          setOrderSubTab(tab.id);
                          setOrderSearchQuery('');
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const activeCategories = categories.filter(cat => cat.id === orderSubTab);

                  const hasVisibleProducts = activeCategories.some(cat => {
                    let catSuggestions = suggestions.filter(s => s.categoria === cat.id);
                    if (orderIsEvent && cat.id === 'helados') {
                      catSuggestions = catSuggestions.filter(s => s.tipo !== 'vasqueta_5_6k');
                    }
                    if (orderSearchQuery) {
                      catSuggestions = catSuggestions.filter(s =>
                        s.nombre.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        formatTipo(s.tipo).toLowerCase().includes(orderSearchQuery.toLowerCase())
                      );
                    }
                    return catSuggestions.length > 0;
                  });

                  if (!hasVisibleProducts) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                        <p style={{ margin: 0, fontWeight: 500 }}>No se encontraron productos en esta categoría.</p>
                      </div>
                    );
                  }

                  return activeCategories.map(cat => {
                    let catSuggestions = suggestions.filter(s => s.categoria === cat.id);
                    if (orderIsEvent && cat.id === 'helados') {
                      catSuggestions = catSuggestions.filter(s => s.tipo !== 'vasqueta_5_6k');
                    }
                    if (orderSearchQuery) {
                      catSuggestions = catSuggestions.filter(s =>
                        s.nombre.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        formatTipo(s.tipo).toLowerCase().includes(orderSearchQuery.toLowerCase())
                      );
                    }
                    if (catSuggestions.length === 0) return null;

                    return (
                      <div key={cat.id} style={{ marginBottom: '1.8rem' }}>
                        <h4 style={{
                          margin: '1.5rem 0 0.75rem 0',
                          color: 'var(--primary)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          paddingBottom: '0.4rem',
                          fontSize: '1.05rem',
                          fontWeight: 600
                        }}>
                          {cat.name}
                        </h4>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Producto / Sabor</th>
                                <th>Mi Stock</th>
                                <th>Stock Fábrica</th>
                                <th>Consumo Prom. Diario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catSuggestions.map(s => {
                                const requestedQty = orderItems[s.producto_id] || 0;
                                const isExceedingFactoryStock = requestedQty > s.stock_fabrica;
                                const isSelected = requestedQty > 0;

                                return (
                                  <tr 
                                    key={s.producto_id}
                                    style={{ 
                                      cursor: 'pointer', 
                                      background: isSelected ? 'rgba(255, 171, 0, 0.08)' : 'transparent',
                                      borderLeft: isSelected ? '3px solid var(--warning)' : '3px solid transparent'
                                    }}
                                    onClick={() => {
                                      setOrderItems(prev => {
                                        const updated = { ...prev };
                                        const current = updated[s.producto_id] || 0;
                                        if (current === 0) {
                                          updated[s.producto_id] = 1;
                                        } else {
                                          updated[s.producto_id] = current + 1;
                                        }
                                        return updated;
                                      });
                                    }}
                                    title="Clic para agregar/sumar al pedido"
                                  >
                                    <td>
                                      <strong>{s.nombre}</strong>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{formatTipo(s.tipo)}</div>
                                      {isExceedingFactoryStock && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                                          ⚠️ Excede stock ({s.stock_fabrica} disponibles)
                                        </div>
                                      )}
                                    </td>
                                    <td>{formatQuantity(s.stock_actual, productos.find(p => p.id === s.producto_id))}</td>
                                    <td>
                                      <span style={{ fontWeight: 600, color: s.stock_fabrica > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {formatQuantity(s.stock_fabrica, productos.find(p => p.id === s.producto_id))}
                                      </span>
                                    </td>
                                    <td>{formatQuantity(s.consumo_promedio_diario, productos.find(p => p.id === s.producto_id))}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}

                {orderSubTab === 'otros' && (
                  <div className="glass-card" style={{ marginTop: '2rem', padding: '1.2rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)', fontWeight: 600 }}>
                      ➕ Agregar Producto Personalizado a "Otros"
                    </h4>
                    <form onSubmit={handleBranchCreateOtrosProduct} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.4rem', display: 'block' }}>Nombre del Producto</label>
                        <input
                          type="text"
                          placeholder="Ej. Vasos de telgopor chicos"
                          className="form-control"
                          value={branchOtrosForm.nombre}
                          onChange={e => setBranchOtrosForm({ ...branchOtrosForm, nombre: e.target.value })}
                          required
                        />
                      </div>
                      <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.4rem', display: 'block' }}>Tipo</label>
                        <select
                          className="form-control"
                          value={branchOtrosForm.tipo}
                          onChange={e => setBranchOtrosForm({ ...branchOtrosForm, tipo: e.target.value })}
                        >
                          <option value="packaging">Packaging</option>
                          <option value="insumo">Insumo</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-secondary" style={{ padding: '0.55rem 1.2rem' }} disabled={loading}>
                        Crear y Agregar
                      </button>
                    </form>
                  </div>
                )}
                </div>

                <div className="glass-card" style={{ flex: '1 1 30%', minWidth: '300px', position: 'sticky', top: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none', marginBottom: '1rem' }}>🛒 Resumen del Pedido</h3>
                  {(() => {
                    const selectedItemsList = Object.entries(orderItems)
                      .filter(([_, qty]) => parseFloat(qty) > 0)
                      .map(([id, qty]) => ({ id: parseInt(id), qty: parseFloat(qty) }));

                    if (selectedItemsList.length === 0) {
                      return <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', textAlign: 'center', padding: '2rem 0' }}>No has seleccionado ningún producto aún.</p>;
                    }

                    return (
                      <>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                          {selectedItemsList.map(item => {
                            const prod = productos.find(p => p.id === item.id);
                            if (!prod) return null;
                            return (
                              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ fontSize: '0.85rem', flex: 1, paddingRight: '0.5rem' }}>
                                    <strong>{prod.nombre}</strong>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{formatTipo(prod.tipo)}</div>
                                  </div>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', borderColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderItems(prev => { const n = {...prev}; delete n[item.id]; return n; });
                                    }}
                                    title="Quitar"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div>
                                  <UnitCalculatorInput
                                    value={item.qty}
                                    onChange={val => {
                                      setOrderItems(prev => ({ ...prev, [item.id]: val }));
                                    }}
                                    product={prod}
                                    placeholder="0"
                                    min={0}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                          <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading} style={{ width: '100%' }}>
                            Enviar Pedido a Fábrica
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'pedidos_lista' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Pedidos y Envíos Entrantes</h3>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por ID o Estado..."
                    value={sucursalOrderSearch}
                    onChange={e => setSucursalOrderSearch(e.target.value)}
                  />
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
                      {orders
                        .filter(order => {
                          if (!sucursalOrderSearch) return true;
                          const q = sucursalOrderSearch.toLowerCase();
                          return (
                            order.id.toString().includes(q) ||
                            (order.estado && translateState(order.estado).toLowerCase().includes(q))
                          );
                        })
                        .map(order => (
                          <tr key={order.id}>
                            <td>
                              #{order.id}
                              {order.es_evento && (
                                <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.35rem', marginLeft: '0.3rem' }}>
                                  Evento
                                </span>
                              )}
                            </td>
                            <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                            <td>{new Date(order.fecha_solicitud).toLocaleString()}</td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                                {order.estado === 'en_transito' || (user.sucursal_id === 4 && order.estado === 'preparado') ? 'Controlar y Recibir' : 'Ver Detalle'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      {orders.filter(order => {
                        if (!sucursalOrderSearch) return true;
                        const q = sucursalOrderSearch.toLowerCase();
                        return (
                          order.id.toString().includes(q) ||
                          (order.estado && translateState(order.estado).toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                            No se encontraron pedidos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'consumo' && (
              <div className="glass-card" style={{ maxWidth: '480px' }}>
                <h3 className="section-title">Registrar Consumo / Venta</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                  Resta stock local cuando consumas o vendas un producto. Esto entrenará las sugerencias de tus futuros pedidos.
                </p>
                <form onSubmit={handleConsumoSubmit}>
                  <div className="form-group">
                    <label>Seleccionar Sabor / Producto</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="🔍 Filtrar productos por nombre..."
                      value={sucursalConsumoSearch}
                      onChange={e => setSucursalConsumoSearch(e.target.value)}
                      style={{
                        marginBottom: '0.6rem',
                        padding: '0.6rem 1rem',
                        fontSize: '0.95rem',
                        borderRadius: '10px',
                        background: 'var(--input-bg)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        color: 'var(--text-dark)',
                        width: '100%'
                      }}
                    />
                    <select
                      className="form-control"
                      value={consumoForm.producto_id}
                      onChange={e => {
                        const pId = e.target.value;
                        const selectedProd = productos.find(p => p.id === parseInt(pId));
                        const isVasqueta = selectedProd && selectedProd.categoria === 'helados' && selectedProd.tipo === 'vasqueta_5_6k';
                        setConsumoForm({
                          ...consumoForm,
                          producto_id: pId,
                          es_evento: isVasqueta ? false : consumoForm.es_evento
                        });
                      }}
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      {categories.map(cat => {
                        let catProds = productos.filter(p => p.categoria === cat.id);
                        if (sucursalConsumoSearch) {
                          catProds = catProds.filter(p =>
                            p.nombre.toLowerCase().includes(sucursalConsumoSearch.toLowerCase()) ||
                            (p.tipo && formatTipo(p.tipo).toLowerCase().includes(sucursalConsumoSearch.toLowerCase()))
                          );
                        }
                        if (catProds.length === 0) return null;
                        return (
                          <optgroup key={cat.id} label={cat.name}>
                            {catProds.map(p => (
                              <option key={p.id} value={p.id}>{getProductOptionLabel(p)}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  {/* Event Checkbox removed for sucursales */}

                  <div className="form-group">
                    <label>Cantidad Consumida</label>
                    <UnitCalculatorInput
                      value={consumoForm.cantidad}
                      onChange={val => setConsumoForm({ ...consumoForm, cantidad: val })}
                      product={productos.find(p => p.id === parseInt(consumoForm.producto_id))}
                      placeholder="Ej. 2"
                      min={1}
                    />
                  </div>
                  <button type="submit" className="btn btn-danger" disabled={loading}>
                    Registrar Consumo y Restar de Stock
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'mi_stock' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Stock Actual en mi Sucursal</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar sabor/producto:</span>
                  <input
                    type="text"
                    className="form-control search-control-responsive"
                    placeholder="🔍 Buscar por nombre..."
                    value={branchStockSearch}
                    onChange={e => setBranchStockSearch(e.target.value)}
                  />
                </div>

                {categories.map(cat => {
                  let catStock = stockData.filter(s => s.categoria === cat.id && s.es_evento === false);
                  if (branchStockSearch) {
                    catStock = catStock.filter(s => 
                      s.producto_nombre.toLowerCase().includes(branchStockSearch.toLowerCase()) ||
                      (s.tipo && formatTipo(s.tipo).toLowerCase().includes(branchStockSearch.toLowerCase()))
                    );
                  }
                  if (catStock.length === 0) return null;

                  return (
                    <div key={cat.id} style={{ marginBottom: '1.8rem' }}>
                      <h4 style={{
                        margin: '1.2rem 0 0.75rem 0',
                        color: 'var(--primary)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '0.4rem',
                        fontSize: '1.05rem',
                        fontWeight: 600
                      }}>
                        {cat.name}
                      </h4>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Producto / Sabor</th>
                              <th>Tipo / Formato</th>
                              <th>Mi Cantidad Disponible</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catStock.map(s => (
                              <tr key={s.producto_id}>
                                <td><strong>{s.producto_nombre}</strong></td>
                                <td style={{ textTransform: 'capitalize' }}>{formatTipo(s.tipo)}</td>
                                <td style={{ fontWeight: 700, color: s.cantidad > 3 ? 'var(--success)' : 'var(--danger)' }}>
                                  {formatQuantity(s.cantidad, productos.find(p => p.id === s.producto_id))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'retiro_interno' && user.sucursal_id === 4 && (
              <div className="glass-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Retiro Interno (Autoabastecimiento)</h3>
                  <button className="btn btn-primary" onClick={handleRetiroInternoSubmit} disabled={loading}>
                    {loading ? 'Procesando...' : 'Confirmar Retiro'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Selecciona los insumos que vas a retirar físicamente de la Fábrica. Al confirmar, el stock se descontará automáticamente de Fábrica y se sumará a Casa Central.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  {['helados', 'termicos', 'otros'].map(sub => (
                    <button
                      key={sub}
                      className={`tab-btn ${orderSubTab === sub ? 'active' : ''}`}
                      onClick={() => setOrderSubTab(sub)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      {sub === 'helados' ? 'Helados' : sub === 'termicos' ? 'Térmicos' : 'Insumos / Otros'}
                    </button>
                  ))}
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto / Sabor</th>
                        <th>Stock Fábrica</th>
                        <th>Cantidad a Retirar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos
                        .filter(p => p.categoria === orderSubTab)
                        .map(p => {
                          const stockFab = stockData.find(s => s.producto_id === p.id && s.sucursal_id === 4)?.cantidad || 0;
                          return (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.nombre}</strong><br/>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{formatTipo(p.tipo)}</span>
                              </td>
                              <td style={{ color: stockFab > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                {stockFab} {p.unidad_medida === 'peso' ? 'kg' : 'u'}
                              </td>
                              <td>
                                <UnitCalculatorInput
                                  value={retiroItems[p.id] || ''}
                                  onChange={(val) => setRetiroItems(prev => ({ ...prev, [p.id]: val }))}
                                  product={p}
                                />
                              </td>
                            </tr>
                          );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ORDER DETAIL MODAL / SUB-SCREEN ================= */}
        {selectedPedido && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto'
          }}>
            <div className="glass-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Pedido #{selectedPedido.id}</h2>
                <button className="btn btn-outline btn-sm" onClick={() => { setSelectedPedido(null); setPrepareStockSource('evento'); }}>Cerrar</button>
              </div>

              <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                <div>
                  <strong>Destino:</strong> {selectedPedido.destino_nombre}<br />
                  <strong>Estado:</strong> <span className={getBadgeClass(selectedPedido.estado)}>{translateState(selectedPedido.estado)}</span>
                </div>
                <div>
                  <strong>Solicitado por:</strong> {selectedPedido.creado_por_nombre || 'N/D'}<br />
                  <strong>Fecha:</strong> {new Date(selectedPedido.fecha_solicitud).toLocaleString()}
                </div>
              </div>

              {/* Items Table */}
              <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Producto / Sabor</th>
                      <th style={{ textAlign: 'center' }}>Solicitado</th>
                      {selectedPedido.estado !== 'solicitado' && <th style={{ textAlign: 'center' }}>Preparado</th>}
                      {selectedPedido.estado !== 'solicitado' && selectedPedido.estado !== 'preparado' && <th style={{ textAlign: 'center' }}>Cargado</th>}
                      {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? <th style={{ textAlign: 'center' }}>Recibido</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.items.map(it => {
                      const prod = productos.find(p => p.id === it.producto_id);
                      return (
                        <tr key={it.producto_id}>
                          <td><strong>{it.producto_nombre}</strong></td>
                          <td style={{ textAlign: 'center' }}>{formatQuantityShort(it.cantidad_solicitada, prod)}</td>
                          {selectedPedido.estado !== 'solicitado' && <td style={{ textAlign: 'center' }}>{formatQuantityShort(it.cantidad_preparada, prod)}</td>}
                          {selectedPedido.estado !== 'solicitado' && selectedPedido.estado !== 'preparado' && <td style={{ textAlign: 'center' }}>{formatQuantityShort(it.cantidad_cargada, prod)}</td>}
                          {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? <td style={{ textAlign: 'center' }}>{formatQuantityShort(it.cantidad_recibida, prod)}</td> : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ACTION: PREPARE ORDER (Transportista / Heladero for event orders) */}
              {(user.rol === 'transportista' || (user.rol === 'heladero' && selectedPedido.es_evento)) && selectedPedido.estado === 'solicitado' && (
                <div>
                  {selectedPedido.es_evento && (
                    <div style={{ marginBottom: '1.2rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '10px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.5rem' }}>
                        📦 Seleccionar Origen del Stock para Descontar:
                      </label>
                      <select
                        className="form-control"
                        value={prepareStockSource}
                        onChange={e => setPrepareStockSource(e.target.value)}
                        style={{
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-dark)',
                          borderRadius: '8px',
                          padding: '0.55rem',
                          fontSize: '0.9rem',
                          width: '100%',
                          fontWeight: 600
                        }}
                      >
                        <option value="evento">🎉 Stock de Eventos (Fabricación para eventos)</option>
                        <option value="comun">📦 Stock Común / Regular (Sucursales)</option>
                      </select>
                    </div>
                  )}
                  <div className="warning-banner">
                    💡 Al presionar "Confirmar Preparación", se descontará la cantidad del stock en fábrica y quedará listo para ser cargado y enviado.
                  </div>
                  <button className="btn btn-success" onClick={handlePrepareOrder} disabled={loading} style={{ width: '100%' }}>
                    Confirmar Preparación de Pedido
                  </button>
                </div>
              )}

              {/* ACTION: LOAD TRUCK (Transportista) */}
              {user.rol === 'transportista' && selectedPedido.estado === 'preparado' && (
                <div>
                  <h4 style={{ marginBottom: '0.75rem' }}>Verificar Carga Física en Vehículo</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                    Indica cuáles productos están disponibles. Si llevas menos de lo preparado o nada, la diferencia quedará pendiente para la sucursal y volverá al stock de fábrica.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {selectedPedido.items.map(it => {
                      const isAvailable = (loadItems[it.producto_id] ?? it.cantidad_preparada) > 0;
                      const loadedQty = loadItems[it.producto_id] ?? it.cantidad_preparada;
                      const pendingQty = Math.max(0, it.cantidad_solicitada - loadedQty);

                      return (
                        <div
                          key={it.producto_id}
                          className="glass-card"
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: isAvailable ? 'rgba(46, 213, 115, 0.05)' : 'rgba(255, 71, 87, 0.05)',
                            border: isAvailable ? '1px solid rgba(46, 213, 115, 0.3)' : '1px solid rgba(255, 71, 87, 0.3)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => {
                              setLoadItems(prev => ({
                                ...prev,
                                [it.producto_id]: isAvailable ? 0 : it.cantidad_preparada
                              }));
                            }}>
                              <input
                                type="checkbox"
                                checked={isAvailable}
                                readOnly
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  accentColor: 'var(--success)',
                                  cursor: 'pointer'
                                }}
                              />
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{it.producto_nombre}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{formatTipo(it.tipo)}</div>
                              </div>
                            </div>
                            <div>
                              <span className={`badge ${isAvailable ? 'badge-activo' : 'badge-inactivo'}`} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem' }}>
                                {isAvailable ? '✓ Disponible' : '✗ Sin Stock'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              <div>Pedido Original: <strong>{formatQuantity(it.cantidad_solicitada, productos.find(p => p.id === it.producto_id))}</strong></div>
                              <div style={{ marginTop: '2px' }}>Preparado en Fábrica: <strong>{formatQuantity(it.cantidad_preparada, productos.find(p => p.id === it.producto_id))}</strong></div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                              {isAvailable ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Cargar:</span>
                                  <div style={{ width: '130px' }}>
                                    <UnitCalculatorInput
                                      value={loadedQty}
                                      onChange={val => {
                                        const clampedVal = Math.min(it.cantidad_preparada, val);
                                        setLoadItems(prev => ({ ...prev, [it.producto_id]: clampedVal }));
                                      }}
                                      product={productos.find(p => p.id === it.producto_id)}
                                      placeholder="Cargar"
                                      min={1}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.85rem' }}>
                                  No se carga (0 u.)
                                </div>
                              )}
                              {pendingQty > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                  ⚠️ Quedarán {formatQuantity(pendingQty, product)} pendientes
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => setSelectedPedido(null)} style={{ flex: 1 }}>
                      ✕ Volver a Pedidos
                    </button>
                    <button className="btn btn-secondary" onClick={handleConfirmLoad} disabled={loading} style={{ flex: 2 }}>
                      Confirmar Carga y Salir de Viaje
                    </button>
                  </div>
                </div>
              )}

            {/* ACTION: IN TRANSIT / DELIVER ACTIONS (Transportista) */}
            {user.rol === 'transportista' && selectedPedido.estado === 'en_transito' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div className="suggestion-banner">
                  <div>
                    <strong>¿Tuviste algún inconveniente en el viaje?</strong><br />
                    Registra roturas o pérdidas antes de llegar.
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowLossModal(true)}>
                    ⚠️ Reportar Rotura/Merma
                  </button>
                </div>

                <button className="btn btn-primary" onClick={handleMarkDelivered} disabled={loading} style={{ width: '100%' }}>
                  Entregar en Sucursal (Confirmar Descarga)
                </button>
              </div>
            )}

            {/* ACTION: CONFIRM RECEIPT / CROSS-CONFIRMATION (Sucursal Employee / Transportista Depot) */}
            {((user.rol === 'sucursal' && (selectedPedido.estado === 'en_transito' || (user.sucursal_id === 4 && selectedPedido.estado === 'preparado'))) ||
              (user.rol === 'transportista' && selectedPedido.sucursal_destino_id === user.sucursal_id && (selectedPedido.estado === 'en_transito' || selectedPedido.estado === 'preparado'))) && (
              <div>
                <h4 style={{ marginBottom: '0.5rem' }}>
                  {user.sucursal_id === 4 ? 'Confirmación de Recepción Interna' : user.rol === 'transportista' ? 'Recepción de Mercadería en Depósito' : 'Control Cruzado de Recepción Física'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                  {user.sucursal_id === 4
                    ? 'Controla la mercadería retirada directamente de Fábrica. Escribe las cantidades físicas recibidas. Si hay diferencias, detalla el motivo.'
                    : user.rol === 'transportista'
                    ? 'Controla los insumos que ingresan a tu depósito. Ingresa las cantidades físicas recibidas.'
                    : 'Controla la mercadería junto con el transportista. Escribe cantidades físicas recibidas. Si hay diferencias, detalla el motivo.'}
                </p>

                <div className="items-selection-grid" style={{ marginBottom: '1.5rem' }}>
                  {selectedPedido.items.map(it => {
                    const baseQty = it.cantidad_cargada > 0 ? it.cantidad_cargada : it.cantidad_preparada;
                    return (
                      <div key={it.producto_id} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong>{it.producto_nombre}</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                            {user.sucursal_id === 4 || user.rol === 'transportista' ? 'Preparado' : 'Despachado'}: <strong>{formatQuantity(baseQty, productos.find(p => p.id === it.producto_id))}</strong>
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
                          <UnitCalculatorInput
                            value={receiveItems[it.producto_id] ?? baseQty}
                            onChange={val => {
                              setReceiveItems(prev => ({ ...prev, [it.producto_id]: val }));
                            }}
                            product={productos.find(p => p.id === it.producto_id)}
                            placeholder="Recibido"
                            min={0}
                          />

                          {(receiveItems[it.producto_id] ?? baseQty) !== baseQty && (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Motivo de la discrepancia (Obligatorio)"
                              value={receiveReasons[it.producto_id] || ''}
                              onChange={e => setReceiveReasons(prev => ({ ...prev, [it.producto_id]: e.target.value }))}
                              required
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button className="btn btn-success" onClick={handleConfirmReceive} disabled={loading} style={{ width: '100%' }}>
                  Confirmar Recepción y Actualizar mi Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

        {/* TRANSIT LOSS MODAL (Driver popup) */}
        {showLossModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1100, padding: '1rem'
          }}>
            <div className="glass-card" style={{ maxWidth: '420px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3>Reportar Incidente en Tránsito</h3>
                <button className="btn btn-outline btn-sm" onClick={() => setShowLossModal(false)}>Cerrar</button>
              </div>

              <form onSubmit={handleReportLoss}>
                <div className="form-group">
                  <label>Sabor dañado/perdido</label>
                  <select
                    className="form-control"
                    value={transitLoss.producto_id}
                    onChange={e => setTransitLoss({ ...transitLoss, producto_id: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {selectedPedido?.items.map(it => (
                      <option key={it.producto_id} value={it.producto_id}>{it.producto_nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad rota/perdida</label>
                  <UnitCalculatorInput
                    value={transitLoss.cantidad_perdida}
                    onChange={e => setTransitLoss({ ...transitLoss, cantidad_perdida: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Motivo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Caída de balde en frenada, pérdida de frío"
                    value={transitLoss.motivo}
                    onChange={e => setTransitLoss({ ...transitLoss, motivo: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-danger" style={{ width: '100%' }} disabled={loading}>
                  Guardar Reporte de Daños
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL EDITAR STOCK (ADMIN) ================= */}
        {showEditStockModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1100, padding: '1rem',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
          }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', background: 'rgba(255, 255, 255, 0.98)', color: '#000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-dark)', fontFamily: 'Outfit' }}>Editar Stock</h3>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                  onClick={() => setShowEditStockModal(false)}
                >✕</button>
              </div>
              <form onSubmit={handleSaveStockAdmin}>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <strong>Producto:</strong> {editStockItemDetails.producto_nombre} <span style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>({formatTipo(editStockItemDetails.tipo)})</span><br/>
                  <strong>Sucursal:</strong> {editStockItemDetails.sucursal_nombre}<br/>
                  <strong>Tipo de Stock:</strong> {editStockForm.es_evento ? 'Eventos' : 'Común'}
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Cantidad Actualizada</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editStockForm.cantidad}
                    onChange={e => setEditStockForm({...editStockForm, cantidad: e.target.value})}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    min="0"
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  Guardar Stock
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL REGISTRO DE MÁQUINA ================= */}
        {showMaquinaModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1100, padding: '1rem',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
          }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.98)', color: '#000', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-dark)', fontFamily: 'Outfit' }}>
                  {editingMaquina ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}
                </h3>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                  onClick={() => {
                    setShowMaquinaModal(false);
                    setEditingMaquina(null);
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMaquina}>
                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Nombre del Equipo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={maquinaForm.nombre}
                    onChange={e => setMaquinaForm({ ...maquinaForm, nombre: e.target.value })}
                    required
                    placeholder="Ej. Cámara de frío, Licuadora 1"
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Tipo de Equipo *</label>
                  <select
                    className="form-control"
                    value={maquinaForm.tipo_equipo}
                    onChange={e => setMaquinaForm({ ...maquinaForm, tipo_equipo: e.target.value })}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    <option value="licuadora_horno_batidora_micro">Licuadora / Horno / Batidora / Microondas</option>
                    <option value="maquina_helado">Máquina de Helado</option>
                    <option value="frio_abatidor_heladera_camara">Abatidor / Heladera / Cámara (Frío)</option>
                    <option value="aire_acondicionado">Aire Acondicionado</option>
                    <option value="otro">Otro Equipo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Sucursal / Ubicación *</label>
                  <select
                    className="form-control"
                    value={maquinaForm.sucursal_id}
                    onChange={e => setMaquinaForm({ ...maquinaForm, sucursal_id: e.target.value })}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Marca</label>
                    <input
                      type="text"
                      className="form-control"
                      value={maquinaForm.marca}
                      onChange={e => setMaquinaForm({ ...maquinaForm, marca: e.target.value })}
                      placeholder="Ej. Bohn, Vitamix"
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Modelo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={maquinaForm.modelo}
                      onChange={e => setMaquinaForm({ ...maquinaForm, modelo: e.target.value })}
                      placeholder="Ej. Quiet One"
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Número de Serie</label>
                    <input
                      type="text"
                      className="form-control"
                      value={maquinaForm.numero_serie}
                      onChange={e => setMaquinaForm({ ...maquinaForm, numero_serie: e.target.value })}
                      placeholder="Ej. SN-88123"
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Fecha Adquisición</label>
                    <input
                      type="date"
                      className="form-control"
                      value={maquinaForm.fecha_adquisicion}
                      onChange={e => setMaquinaForm({ ...maquinaForm, fecha_adquisicion: e.target.value })}
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Estado *</label>
                  <select
                    className="form-control"
                    value={maquinaForm.estado}
                    onChange={e => setMaquinaForm({ ...maquinaForm, estado: e.target.value })}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    <option value="activo">Activo / Operativo</option>
                    <option value="inactivo">Inactivo / Parado</option>
                    <option value="en_mantenimiento">En Mantenimiento</option>
                    <option value="de_baja">De Baja / Descartado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Descripción / Observaciones</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={maquinaForm.descripcion}
                    onChange={e => setMaquinaForm({ ...maquinaForm, descripcion: e.target.value })}
                    placeholder="Detalles adicionales sobre el equipo..."
                    style={{ border: '1px solid rgba(0,0,0,0.15)', resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowMaquinaModal(false);
                      setEditingMaquina(null);
                    }}
                    disabled={loading}
                    style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingMaquina ? 'Actualizar Equipo' : 'Guardar Equipo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL REGISTRO DE MANTENIMIENTO ================= */}
        {showMaintenanceModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1100, padding: '1rem',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
          }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.98)', color: '#000', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-dark)', fontFamily: 'Outfit' }}>
                  {editingMaintenance ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}
                </h3>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setEditingMaintenance(null);
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMaintenance}>
                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Seleccionar Equipo *</label>
                  <select
                    className="form-control"
                    value={maintenanceForm.maquina_id}
                    onChange={e => {
                      const maqId = e.target.value;
                      const options = getMaintenanceOptionsForMachine(maqId);
                      setMaintenanceForm(prev => ({
                        ...prev,
                        maquina_id: maqId,
                        tipo: options.length > 0 ? options[0].value : 'otro'
                      }));
                    }}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    disabled={editingMaintenance}
                  >
                    <option value="">-- Seleccionar --</option>
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre} ({m.sucursal_nombre})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Tipo de Trabajo *</label>
                  <select
                    className="form-control"
                    value={maintenanceForm.tipo}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, tipo: e.target.value })}
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    {maintenanceForm.maquina_id ? (
                      getMaintenanceOptionsForMachine(maintenanceForm.maquina_id).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))
                    ) : (
                      <option value="otro">Selecciona primero un equipo</option>
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Fecha de Trabajo *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={maintenanceForm.fecha}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, fecha: e.target.value })}
                      required
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Próximo Control (Opcional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={maintenanceForm.proxima_fecha}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, proxima_fecha: e.target.value })}
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Descripción / Diagnóstico del Trabajo *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={maintenanceForm.descripcion}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, descripcion: e.target.value })}
                    placeholder="Detalles sobre lo realizado (ej: Limpieza profunda de los serpentines, cambio de aceite...)"
                    required
                    style={{ border: '1px solid rgba(0,0,0,0.15)', resize: 'vertical' }}
                  ></textarea>
                </div>

                {/* Cambio de Repuesto Checkbox */}
                <div style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px dashed rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  padding: '0.8rem',
                  marginBottom: '1.2rem'
                }}>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <input
                      type="checkbox"
                      id="maintCambioRepuesto"
                      checked={maintenanceForm.cambio_repuesto}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, cambio_repuesto: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="maintCambioRepuesto" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                      🔧 ¿Hubo cambio de repuesto?
                    </label>
                  </div>

                  {maintenanceForm.cambio_repuesto && (
                    <div className="form-group" style={{ marginTop: '0.8rem', marginBottom: 0 }}>
                      <label style={{ color: 'var(--text-dark)', fontSize: '0.8rem', fontWeight: 600 }}>Detalle de Repuestos Cambiados *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Cambio de correa dentada, recambio de capacitor"
                        value={maintenanceForm.repuesto_detalle}
                        onChange={e => setMaintenanceForm({ ...maintenanceForm, repuesto_detalle: e.target.value })}
                        required={maintenanceForm.cambio_repuesto}
                        style={{ border: '1px solid rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Costo ($ ARS)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={maintenanceForm.costo}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, costo: e.target.value })}
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Técnico / Empresa</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Refrigeración González"
                      value={maintenanceForm.realizado_por}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, realizado_por: e.target.value })}
                      style={{ border: '1px solid rgba(0,0,0,0.15)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowMaintenanceModal(false);
                      setEditingMaintenance(null);
                    }}
                    disabled={loading}
                    style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingMaintenance ? 'Actualizar Trabajo' : 'Registrar Trabajo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
