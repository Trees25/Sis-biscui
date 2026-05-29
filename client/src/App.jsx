import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
const categories = [
  { id: 'helados', name: 'Helados' },
  { id: 'pasteleria_helada', name: 'Pastelería Helada' },
  { id: 'pasteleria', name: 'Pastelería Clásica' },
  { id: 'viennoiserie', name: 'Viennoiserie' },
  { id: 'termicos', name: 'Térmicos' },
  { id: 'otros', name: 'Otros' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  
  // Data states
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  
  // Action/Form states
  const [loading, setLoading] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  
  // Production form state
  const [prodForm, setProdForm] = useState({ producto_id: '', cantidad: '', fecha: new Date().toISOString().slice(0, 10) });
  const [prodWeights, setProdWeights] = useState([]);
  const [recentLotes, setRecentLotes] = useState([]);
  const [stockGroupFilter, setStockGroupFilter] = useState('Todos');
  const [orderSubTab, setOrderSubTab] = useState('helados');
  const [adminStockTab, setAdminStockTab] = useState('helados');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [branchOtrosForm, setBranchOtrosForm] = useState({ nombre: '', tipo: 'packaging' });

  // Admin historic production form state
  const [adminHistForm, setAdminHistForm] = useState({ producto_id: '', cantidad: '', fecha: new Date().toISOString().slice(0, 10) });
  const [adminHistWeights, setAdminHistWeights] = useState([]);
  const [adminHistDefaultWeight, setAdminHistDefaultWeight] = useState('');
  
  // Order creation form state
  const [orderItems, setOrderItems] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  
  // Consumption form state
  const [consumoForm, setConsumoForm] = useState({ producto_id: '', cantidad: '' });

  // Driver load edit state
  const [loadItems, setLoadItems] = useState({});
  const [transitLoss, setTransitLoss] = useState({ producto_id: '', cantidad_perdida: '', motivo: '' });
  const [showLossModal, setShowLossModal] = useState(false);

  // Branch receive check state
  const [receiveItems, setReceiveItems] = useState({});
  const [receiveReasons, setReceiveReasons] = useState({});

  // Admin new product form
  const [newProductForm, setNewProductForm] = useState({ nombre: '', categoria: 'helados', tipo: 'vasqueta_5_6k' });

  const getTiposPorCategoria = (categoria) => {
    switch (categoria) {
      case 'helados':
        return [
          { value: 'vasqueta_5_6k', label: 'Vasqueta' },
          { value: 'balde_4k', label: 'Balde 5k' },
          { value: 'balde_8k', label: 'Balde 10k' }
        ];
      case 'pasteleria_helada':
        return [
          { value: 'cubanitos', label: 'Cubanitos' },
          { value: 'buche_oreo', label: 'Buche Oreo' },
          { value: 'buche_tiramisu', label: 'Buche Tiramisú' },
          { value: 'paleta', label: 'Paleta' },
          { value: 'mini_paleta', label: 'Mini Paleta' },
          { value: 'lingote', label: 'Lingote' },
          { value: 'mini_cake', label: 'Mini Cake' }
        ];
      case 'pasteleria':
        return [
          { value: 'lemon_pie', label: 'Lemon Pie' },
          { value: 'cheesecake', label: 'Cheesecake' },
          { value: 'mini_cheesecake', label: 'Mini Cheesecake' },
          { value: 'pirinea', label: 'Pirinea' },
          { value: 'mini_pirinea', label: 'Mini Pirinea' },
          { value: 'torta', label: 'Torta' }
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
    'Dulces de leche': ['Chocotorta', 'Bicuí', 'Rogel', 'Granizado', 'Coco crunch'],
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
      .replace(/ \(10k\)$/, '');
  };

  const formatTipo = (tipo) => {
    if (tipo === 'vasqueta_5_6k') return 'Vasqueta';
    if (tipo === 'balde_4k') return 'Balde 5k';
    if (tipo === 'balde_8k') return 'Balde 10k';
    return tipo?.replace(/_/g, ' ');
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
      case 'balde_4k': return 5.0;
      case 'balde_8k': return 10.0;
      default: return 0.0;
    }
  };

  const getGroupedStock = () => {
    const factoryStock = stockData.filter(s => s.sucursal_id === 1 && s.categoria === 'helados');
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
      else if (sessionUser.rol === 'heladero' || sessionUser.rol === 'pastelero') setActiveTab('produccion');
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

  // Helper for quick login buttons (for testing convenience)
  const quickLogin = (u, p) => {
    setUsernameInput(u);
    setPasswordInput(p);
  };

  // Fetch core data based on logged in user and tab
  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch active products
      const { data: pData, error: pErr } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', 1);
      if (pErr) throw pErr;
      setProductos(pData || []);

      // Fetch branches
      const { data: sData, error: sErr } = await supabase
        .from('sucursales')
        .select('*');
      if (sErr) throw sErr;
      setSucursales(sData || []);

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

      // Fetch stock (filtered by sucursal if sucursal employee)
      let stockQuery = supabase
        .from('stock_sucursales')
        .select(`
          sucursal_id,
          sucursales ( nombre ),
          producto_id,
          productos ( nombre, tipo, categoria, activo ),
          cantidad
        `);
      if (user.rol === 'sucursal') {
        stockQuery = stockQuery.eq('sucursal_id', user.sucursal_id);
      }
      const { data: rawStock, error: stockErr } = await stockQuery;
      if (stockErr) throw stockErr;
      
      const stockD = (rawStock || [])
        .filter(s => s.productos && s.productos.activo === 1)
        .map(s => ({
          sucursal_id: s.sucursal_id,
          sucursal_nombre: s.sucursales?.nombre,
          producto_id: s.producto_id,
          producto_nombre: s.productos?.nombre,
          tipo: s.productos?.tipo,
          categoria: s.productos?.categoria,
          cantidad: s.cantidad
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
      } else if (user.rol === 'heladero' || user.rol === 'pastelero') {
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
            cantidad
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
            cantidad: s.cantidad
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

        const stockFabrica = stockAll.filter(s => s.sucursal_id === 1);
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
        const { data: activeProds, error: apErr } = await supabase
          .from('productos')
          .select('id, nombre, tipo, categoria')
          .eq('activo', 1);
        if (apErr) throw apErr;

        const { data: localSt, error: lsErr } = await supabase
          .from('stock_sucursales')
          .select('producto_id, cantidad')
          .eq('sucursal_id', user.sucursal_id);
        if (lsErr) throw lsErr;
        const stockLocalMap = {};
        (localSt || []).forEach(s => stockLocalMap[s.producto_id] = s.cantidad);

        const { data: factorySt, error: fsErr } = await supabase
          .from('stock_sucursales')
          .select('producto_id, cantidad')
          .eq('sucursal_id', 1);
        if (fsErr) throw fsErr;
        const stockFabricaMap = {};
        (factorySt || []).forEach(s => stockFabricaMap[s.producto_id] = s.cantidad);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: consumosRaw, error: cErr } = await supabase
          .from('consumo_diario')
          .select('producto_id, cantidad')
          .eq('sucursal_id', user.sucursal_id)
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

        const initialItems = {};
        suggestionsD.forEach(s => {
          initialItems[s.producto_id] = 0;
        });
        setOrderItems(initialItems);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh stats every 15 seconds to keep it live
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

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

      // Insert production batch
      const { error: insErr } = await supabase
        .from('lotes_produccion')
        .insert({
          codigo_lote,
          producto_id: pId,
          cantidad: qty,
          pesos: pesosArray,
          fecha_produccion: pDate.toISOString(),
          creado_por: user.id
        });
      if (insErr) throw insErr;

      // Update Factory Stock (sucursal_id = 1)
      const { data: currentStock, error: selectStockErr } = await supabase
        .from('stock_sucursales')
        .select('cantidad')
        .eq('sucursal_id', 1)
        .eq('producto_id', pId)
        .maybeSingle();
      
      if (selectStockErr) throw selectStockErr;

      if (currentStock) {
        const { error: updErr } = await supabase
          .from('stock_sucursales')
          .update({ cantidad: currentStock.cantidad + qty })
          .eq('sucursal_id', 1)
          .eq('producto_id', pId);
        if (updErr) throw updErr;
      } else {
        const { error: insStockErr } = await supabase
          .from('stock_sucursales')
          .insert({
            sucursal_id: 1,
            producto_id: pId,
            cantidad: qty
          });
        if (insStockErr) throw insStockErr;
      }

      showToast(`Producción registrada con Lote ${codigo_lote}. Stock de fábrica actualizado.`);
      setProdForm({ producto_id: '', cantidad: '', fecha: new Date().toISOString().slice(0, 10) });
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

      // Insert production batch
      const { error: insErr } = await supabase
        .from('lotes_produccion')
        .insert({
          codigo_lote,
          producto_id: pId,
          cantidad: qty,
          pesos: pesosArray,
          fecha_produccion: pDate.toISOString(),
          creado_por: user.id
        });
      if (insErr) throw insErr;

      // Update Factory Stock (sucursal_id = 1)
      const { data: currentStock, error: selectStockErr } = await supabase
        .from('stock_sucursales')
        .select('cantidad')
        .eq('sucursal_id', 1)
        .eq('producto_id', pId)
        .maybeSingle();
      
      if (selectStockErr) throw selectStockErr;

      if (currentStock) {
        const { error: updErr } = await supabase
          .from('stock_sucursales')
          .update({ cantidad: currentStock.cantidad + qty })
          .eq('sucursal_id', 1)
          .eq('producto_id', pId);
        if (updErr) throw updErr;
      } else {
        const { error: insStockErr } = await supabase
          .from('stock_sucursales')
          .insert({
            sucursal_id: 1,
            producto_id: pId,
            cantidad: qty
          });
        if (insStockErr) throw insStockErr;
      }

      showToast(`Producción histórica registrada con Lote ${codigo_lote}. Stock de fábrica actualizado.`);
      setAdminHistForm({ producto_id: '', cantidad: '', fecha: new Date().toISOString().slice(0, 10) });
      setAdminHistWeights([]);
      setAdminHistDefaultWeight('');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Branch Consumption Form Submit
  const handleConsumoSubmit = async (e) => {
    e.preventDefault();
    if (!consumoForm.producto_id || !consumoForm.cantidad) return;
    setLoading(true);
    try {
      const pId = parseInt(consumoForm.producto_id);
      const qty = parseInt(consumoForm.cantidad);

      // Check current stock
      const { data: stock, error: sErr } = await supabase
        .from('stock_sucursales')
        .select('cantidad')
        .eq('sucursal_id', user.sucursal_id)
        .eq('producto_id', pId)
        .maybeSingle();

      if (sErr) throw sErr;
      if (!stock || stock.cantidad < qty) {
        throw new Error('Stock insuficiente en la sucursal para registrar este consumo.');
      }

      // Decrease stock
      const { error: updErr } = await supabase
        .from('stock_sucursales')
        .update({ cantidad: stock.cantidad - qty })
        .eq('sucursal_id', user.sucursal_id)
        .eq('producto_id', pId);
      if (updErr) throw updErr;

      // Log in consumption history
      const { error: consErr } = await supabase
        .from('consumo_diario')
        .insert({
          sucursal_id: user.sucursal_id,
          producto_id: pId,
          cantidad: qty
        });
      if (consErr) throw consErr;

      // Log as discrepancy
      const { error: discErr } = await supabase
        .from('discrepancias')
        .insert({
          pedido_id: null,
          producto_id: pId,
          tipo: user.sucursal_id === 1 ? 'merma_fabrica' : 'merma_sucursal',
          cantidad_perdida: qty,
          motivo: 'Consumo registrado por sucursal',
          reportado_por_id: user.id
        });
      if (discErr) throw discErr;

      showToast('Consumo registrado exitosamente.');
      setConsumoForm({ producto_id: '', cantidad: '' });
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
          creado_por_id: user.id
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

      showToast('Pedido solicitado a Fábrica.');
      setActiveTab('pedidos_lista');
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

      // Fetch stock at Factory (sucursal_id = 1) for each product
      const { data: factoryStock, error: fsErr } = await supabase
        .from('stock_sucursales')
        .select('producto_id, cantidad')
        .eq('sucursal_id', 1);
      
      if (fsErr) throw fsErr;
      const fsMap = {};
      (factoryStock || []).forEach(s => fsMap[s.producto_id] = s.cantidad);

      const itemsMapped = (items || []).map(it => ({
        ...it,
        producto_name: it.productos?.nombre,
        producto_nombre: it.productos?.nombre,
        tipo: it.productos?.tipo,
        categoria: it.productos?.categoria,
        stock_fabrica: fsMap[it.producto_id] || 0
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
        recs[it.producto_id] = order.estado === 'solicitado' ? it.cantidad_solicitada : it.cantidad_cargada;
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
      // Check and deduct factory stock for each item
      const { data: factorySt, error: fsErr } = await supabase
        .from('stock_sucursales')
        .select('producto_id, cantidad')
        .eq('sucursal_id', 1);
      
      if (fsErr) throw fsErr;
      const fsMap = {};
      (factorySt || []).forEach(s => fsMap[s.producto_id] = s.cantidad);

      for (let item of selectedPedido.items) {
        const available = fsMap[item.producto_id] || 0;
        if (available < item.cantidad_solicitada) {
          throw new Error(`Stock insuficiente en fábrica para preparar la cantidad del sabor: ${item.producto_nombre}.`);
        }
      }

      // Deduct stock from Factory and update prepared/loaded quantities
      for (let item of selectedPedido.items) {
        const available = fsMap[item.producto_id] || 0;
        const qtyPrep = item.cantidad_solicitada;

        const { error: updStockErr } = await supabase
          .from('stock_sucursales')
          .update({ cantidad: available - qtyPrep })
          .eq('sucursal_id', 1)
          .eq('producto_id', item.producto_id);
        if (updStockErr) throw updStockErr;

        const { error: updDetErr } = await supabase
          .from('pedido_detalles')
          .update({
            cantidad_preparada: qtyPrep,
            cantidad_cargada: qtyPrep
          })
          .eq('pedido_id', selectedPedido.id)
          .eq('producto_id', item.producto_id);
        if (updDetErr) throw updDetErr;
      }

      // Update order status
      const { error: updOrderErr } = await supabase
        .from('pedidos')
        .update({
          estado: 'preparado',
          preparado_por_id: user.id,
          fecha_preparacion: new Date().toISOString()
        })
        .eq('id', selectedPedido.id);
      
      if (updOrderErr) throw updOrderErr;

      showToast('Pedido preparado y stock de fábrica reservado.');
      setSelectedPedido(null);
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
      for (let item of items) {
        const { error: updDetErr } = await supabase
          .from('pedido_detalles')
          .update({ cantidad_cargada: item.cantidad_cargada })
          .eq('pedido_id', selectedPedido.id)
          .eq('producto_id', item.producto_id);
        if (updDetErr) throw updDetErr;

        const origDetail = selectedPedido.items.find(it => it.producto_id === item.producto_id);
        const diff = (origDetail?.cantidad_preparada || 0) - item.cantidad_cargada;
        if (diff > 0) {
          const { data: fsSt, error: fsErr } = await supabase
            .from('stock_sucursales')
            .select('cantidad')
            .eq('sucursal_id', 1)
            .eq('producto_id', item.producto_id)
            .maybeSingle();
          if (fsErr) throw fsErr;
          
          const currentQty = fsSt?.cantidad || 0;
          const { error: updStockErr } = await supabase
            .from('stock_sucursales')
            .update({ cantidad: currentQty + diff })
            .eq('sucursal_id', 1)
            .eq('producto_id', item.producto_id);
          if (updStockErr) throw updStockErr;

          const { error: discErr } = await supabase
            .from('discrepancias')
            .insert({
              pedido_id: selectedPedido.id,
              producto_id: item.producto_id,
              tipo: 'merma_fabrica',
              cantidad_perdida: diff,
              motivo: 'No cargado en camión / devuelto a stock de fábrica',
              reportado_por_id: user.id
            });
          if (discErr) throw discErr;
        }
      }

      const { error: updOrderErr } = await supabase
        .from('pedidos')
        .update({
          estado: 'en_transito',
          transportista_id: user.id,
          fecha_despacho: new Date().toISOString()
        })
        .eq('id', selectedPedido.id);
      
      if (updOrderErr) throw updOrderErr;

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
          reportado_por_id: user.id
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
      let hasDiscrepancies = false;

      if (selectedPedido.estado === 'solicitado') {
        const { data: factorySt, error: fsErr } = await supabase
          .from('stock_sucursales')
          .select('producto_id, cantidad')
          .eq('sucursal_id', 1);
        
        if (fsErr) throw fsErr;
        const fsMap = {};
        (factorySt || []).forEach(s => fsMap[s.producto_id] = s.cantidad);

        for (let item of items) {
          const available = fsMap[item.producto_id] || 0;
          if (available < item.cantidad_recibida) {
            const prodName = selectedPedido.items.find(it => it.producto_id === item.producto_id)?.producto_nombre || 'Producto';
            throw new Error(`Stock insuficiente en fábrica para preparar el sabor: ${prodName}.`);
          }
        }

        for (let item of items) {
          const available = fsMap[item.producto_id] || 0;
          const { error: updStockErr } = await supabase
            .from('stock_sucursales')
            .update({ cantidad: available - item.cantidad_recibida })
            .eq('sucursal_id', 1)
            .eq('producto_id', item.producto_id);
          if (updStockErr) throw updStockErr;

          const { error: updDetErr } = await supabase
            .from('pedido_detalles')
            .update({
              cantidad_preparada: item.cantidad_recibida,
              cantidad_cargada: item.cantidad_recibida
            })
            .eq('pedido_id', selectedPedido.id)
            .eq('producto_id', item.producto_id);
          if (updDetErr) throw updDetErr;
        }
      }

      for (let item of items) {
        const { error: updDetErr } = await supabase
          .from('pedido_detalles')
          .update({ cantidad_recibida: item.cantidad_recibida })
          .eq('pedido_id', selectedPedido.id)
          .eq('producto_id', item.producto_id);
        if (updDetErr) throw updDetErr;

        const { data: st, error: stErr } = await supabase
          .from('stock_sucursales')
          .select('cantidad')
          .eq('sucursal_id', selectedPedido.sucursal_destino_id)
          .eq('producto_id', item.producto_id)
          .maybeSingle();
        if (stErr) throw stErr;

        if (st) {
          const { error: updStockErr } = await supabase
            .from('stock_sucursales')
            .update({ cantidad: st.cantidad + item.cantidad_recibida })
            .eq('sucursal_id', selectedPedido.sucursal_destino_id)
            .eq('producto_id', item.producto_id);
          if (updStockErr) throw updStockErr;
        } else {
          const { error: insStockErr } = await supabase
            .from('stock_sucursales')
            .insert({
              sucursal_id: selectedPedido.sucursal_destino_id,
              producto_id: item.producto_id,
              cantidad: item.cantidad_recibida
            });
          if (insStockErr) throw insStockErr;
        }

        const origDetail = selectedPedido.items.find(it => it.producto_id === item.producto_id);
        const loadedQty = selectedPedido.estado === 'solicitado' ? item.cantidad_recibida : (origDetail ? origDetail.cantidad_cargada : 0);
        const diff = loadedQty - item.cantidad_recibida;
        
        if (diff !== 0) {
          hasDiscrepancies = true;
          const { error: discErr } = await supabase
            .from('discrepancias')
            .insert({
              pedido_id: selectedPedido.id,
              producto_id: item.producto_id,
              tipo: 'recepcion',
              cantidad_perdida: diff,
              motivo: item.motivo_diferencia || 'Diferencia en recepción física',
              reportado_por_id: user.id
            });
          if (discErr) throw discErr;
        }
      }

      const finalEstado = hasDiscrepancies ? 'con_discrepancia' : 'entregado';
      const { error: updOrderErr } = await supabase
        .from('pedidos')
        .update({
          estado: finalEstado,
          recibido_por_id: user.id,
          fecha_entrega: selectedPedido.fecha_entrega || new Date().toISOString()
        })
        .eq('id', selectedPedido.id);
      
      if (updOrderErr) throw updOrderErr;

      showToast(`Pedido recibido. Estado final: ${finalEstado === 'entregado' ? 'Entregado OK' : 'Entregado con Discrepancias'}.`);
      setSelectedPedido(null);
      fetchData();
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
          tipo: newProductForm.tipo
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
      setNewProductForm({ nombre: '', categoria: 'helados', tipo: 'vasqueta_5_6k' });
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

  // Rendering login if not logged in
  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="glass-card login-card">
          <div className="login-logo">
            <h1>Biscui</h1>
            <p>Trazabilidad y Control de Stock</p>
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

          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 600 }}>Cuentas de Prueba:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('admin@biscui.com', 'admin')}>Admin</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('heladero@biscui.com', '123')}>Heladero</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('pastelero@biscui.com', '123')}>Pastelero</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('driver@biscui.com', '123')}>Transportista</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('empleado1@biscui.com', '123')}>Suc. Principal</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('empleado2@biscui.com', '123')}>Suc. Centro</button>
              <button className="btn btn-sm btn-outline" onClick={() => quickLogin('empleado3@biscui.com', '123')}>Suc. Shopping</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <h1>Biscui</h1>
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
              <button className={`tab-btn ${activeTab === 'discrepancias' ? 'active' : ''}`} onClick={() => setActiveTab('discrepancias')}>Historial de Pérdidas</button>
              <button className={`tab-btn ${activeTab === 'produccion_req' ? 'active' : ''}`} onClick={() => setActiveTab('produccion_req')}>Proyecciones de Fábrica</button>
              <button className={`tab-btn ${activeTab === 'carga_historica' ? 'active' : ''}`} onClick={() => setActiveTab('carga_historica')}>Carga Histórica</button>
              <button className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveTab('catalogo')}>Nuevo Sabor</button>
            </div>

            {activeTab === 'matrix' && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                  Monitorea los niveles de inventario en tiempo real de cada sabor y producto en todas las locaciones físicas de Biscui.
                </p>

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
                  if (selectedCat.id === 'helados' && stockGroupFilter !== 'Todos') {
                    catProds = catProds.filter(p => getFlavorGroup(p.nombre) === stockGroupFilter);
                  }

                  return (
                    <div className="glass-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        <h3 className="section-title" style={{ margin: 0, border: 'none' }}>{selectedCat.name}</h3>
                        {selectedCat.id === 'helados' && (
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
                        )}
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
                                <th>Fábrica</th>
                                <th>Sucursal Principal</th>
                                <th>Sucursal Centro</th>
                                <th>Sucursal Shopping</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catProds.map(prod => {
                                const stockFab = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 1)?.cantidad || 0;
                                const stockPrincipal = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 4)?.cantidad || 0;
                                const stockCentro = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 2)?.cantidad || 0;
                                const stockShop = stockData.find(s => s.producto_id === prod.id && s.sucursal_id === 3)?.cantidad || 0;
                                
                                const getCellClass = (qty) => {
                                  if (qty === 0) return 'matrix-cell-empty';
                                  if (qty < 5) return 'matrix-cell-low';
                                  return 'matrix-cell-ok';
                                };

                                return (
                                  <tr key={prod.id}>
                                    <td><strong>{prod.nombre}</strong></td>
                                    <td><span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{formatTipo(prod.tipo)}</span></td>
                                    <td className={getCellClass(stockFab)}>{stockFab}</td>
                                    <td className={getCellClass(stockPrincipal)}>{stockPrincipal}</td>
                                    <td className={getCellClass(stockCentro)}>{stockCentro}</td>
                                    <td className={getCellClass(stockShop)}>{stockShop}</td>
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

            {activeTab === 'flujo' && (
              <div className="glass-card">
                <h3 className="section-title">Flujo y Auditoría de Pedidos</h3>
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
                      {orders.map(order => (
                        <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => viewOrderDetail(order.id)}>
                          <td>#{order.id}</td>
                          <td><strong>{order.destino_nombre}</strong></td>
                          <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                          <td>{order.fecha_solicitud ? new Date(order.fecha_solicitud).toLocaleDateString() : '-'}</td>
                          <td>{order.fecha_preparacion ? new Date(order.fecha_preparacion).toLocaleDateString() : 'Pendiente'}</td>
                          <td>{order.fecha_despacho ? new Date(order.fecha_despacho).toLocaleDateString() : 'Pendiente'}</td>
                          <td>{order.fecha_entrega ? new Date(order.fecha_entrega).toLocaleDateString() : 'Pendiente'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'discrepancias' && (
              <div className="glass-card">
                <h3 className="section-title">Historial de Pérdidas y Diferencias</h3>
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
                      {dashboardStats?.discrepancies.map(disc => (
                        <tr key={disc.id}>
                          <td>{new Date(disc.fecha_reporte).toLocaleDateString()}</td>
                          <td><strong>{disc.producto_nombre}</strong></td>
                          <td>
                            <span className={`badge ${
                              disc.tipo === 'transito' ? 'badge-en_transito' : 
                              disc.tipo === 'recepcion' ? 'badge-con_discrepancia' : 'badge-solicitado'
                            }`}>
                              {disc.tipo === 'transito' ? 'En Tránsito' : 
                               disc.tipo === 'recepcion' ? 'Recepción' : 'Merma Fábrica'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{disc.cantidad_perdida}</td>
                          <td>{disc.motivo}</td>
                          <td>{disc.reportado_por_nombre}</td>
                        </tr>
                      ))}
                      {(!dashboardStats?.discrepancies || dashboardStats.discrepancies.length === 0) && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                            No hay mermas o discrepancias registradas.
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
                  <h3 className="section-title">Sugerencias de Fabricación (Demanda vs Stock Fábrica)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                    Flujo de planificación inteligente: sabores solicitados por sucursales en pedidos activos que superan el stock actual en fábrica.
                  </p>
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
                        {dashboardStats?.productionNeeded.map(prod => (
                          <tr key={prod.producto_id}>
                            <td><strong>{prod.producto_nombre}</strong></td>
                            <td style={{ textTransform: 'capitalize' }}>{prod.tipo}</td>
                            <td style={{ fontWeight: 600 }}>{prod.cantidad_pendiente}</td>
                            <td>{prod.stock_fabrica || 0}</td>
                            <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                              {Math.max(0, prod.cantidad_pendiente - (prod.stock_fabrica || 0))}
                            </td>
                          </tr>
                        ))}
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
                              <td><strong>{l.cantidad}</strong></td>
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
              <div className="glass-card" style={{ maxWidth: '480px' }}>
                <h3 className="section-title">Agregar Nuevo Producto</h3>
                <form onSubmit={handleNewProductSubmit}>
                  <div className="form-group">
                    <label>Nombre del Sabor o Producto</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newProductForm.nombre}
                      onChange={e => setNewProductForm({...newProductForm, nombre: e.target.value})}
                      required
                      placeholder="Ej. Vasqueta Sabayón con Almendras"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select 
                      className="form-control"
                      value={newProductForm.categoria}
                      onChange={e => handleCategoriaChange(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo / Formato</label>
                    <select 
                      className="form-control"
                      value={newProductForm.tipo}
                      onChange={e => setNewProductForm({...newProductForm, tipo: e.target.value})}
                    >
                      {getTiposPorCategoria(newProductForm.categoria).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Agregar al Catálogo
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'carga_historica' && (
              <div className="dashboard-grid">
                <div className="glass-card" style={{ maxWidth: '500px' }}>
                  <h3 className="section-title">Carga de Producción Histórica / Pre-Sistema</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                    Registra producciones anteriores al sistema para inicializar el stock en fábrica y mantener la trazabilidad de lotes y pesos.
                  </p>
                  <form onSubmit={handleAdminHistSubmit}>
                    <div className="form-group">
                      <label>Seleccionar Producto / Sabor</label>
                      <select 
                        className="form-control"
                        value={adminHistForm.producto_id}
                        onChange={e => {
                          const pId = e.target.value;
                          setAdminHistForm({ ...adminHistForm, producto_id: pId, cantidad: '' });
                          setAdminHistWeights([]);
                        }}
                        required
                      >
                        <option value="">-- Seleccionar --</option>
                        {categories
                          .filter(cat => cat.id === 'helados')
                          .map(cat => {
                            const catProds = productos.filter(p => p.categoria === cat.id);
                            return (
                              <optgroup key={cat.id} label={cat.name}>
                                {catProds.map(p => (
                                  <option key={p.id} value={p.id}>{p.nombre} ({formatTipo(p.tipo)})</option>
                                ))}
                              </optgroup>
                            );
                          })
                        }
                      </select>
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

                    <div className="form-group">
                      <label>Cantidad Fabricada (unidades)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="form-control"
                        value={adminHistForm.cantidad}
                        onChange={e => {
                          const val = e.target.value;
                          const qty = parseInt(val) || 0;
                          setAdminHistForm({ ...adminHistForm, cantidad: val });
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
                        required
                        placeholder="Ej. 5"
                      />
                    </div>

                    {/* Weight Inputs for Helado */}
                    {productos.find(p => p.id === parseInt(adminHistForm.producto_id)) && parseInt(adminHistForm.cantidad) > 0 && (
                      <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                          Pesos Individuales (Balanza)
                        </h4>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                          Envase: <strong style={{color:'var(--text)'}}>{formatTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{color:'var(--text)'}}>{getTareByTipo(productos.find(p => p.id === parseInt(adminHistForm.producto_id))?.tipo).toFixed(3)} kg</strong>
                        </div>

                        {/* Autofill helper input for bulk entry */}
                        <div className="form-group" style={{ marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                      Cargar Producción Pre-Sistema
                    </button>
                  </form>
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
                                      Neto total: <strong style={{color:'var(--success)'}}>{netKilos.toFixed(2)} kg</strong>
                                    </div>
                                  )}
                                </td>
                                <td><strong>{l.cantidad}</strong></td>
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
          </div>
        )}

        {/* ================= HELADERO / PASTELERO VIEW ================= */}
        {(user.rol === 'heladero' || user.rol === 'pastelero') && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'produccion' ? 'active' : ''}`} onClick={() => setActiveTab('produccion')}>
                {user.rol === 'pastelero' ? 'Cargar Pastelería' : 'Cargar Producción'}
              </button>
              <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Mi Stock Fábrica</button>
            </div>

            {activeTab === 'produccion' && (
              <div className="dashboard-grid">
                <div className="glass-card">
                  <h3 className="section-title">
                    {user.rol === 'pastelero' ? 'Registro de Pastelería' : 'Registro de Fabricación'}
                  </h3>
                  <form onSubmit={handleProductionSubmit}>
                    <div className="form-group">
                      <label>Seleccionar Producto / Sabor</label>
                      <select 
                        className="form-control"
                        value={prodForm.producto_id}
                        onChange={e => {
                          const pId = e.target.value;
                          setProdForm({ producto_id: pId, cantidad: '' });
                          setProdWeights([]);
                        }}
                        required
                      >
                        <option value="">-- Seleccionar --</option>
                        {categories
                          .filter(cat => user.rol === 'heladero' ? cat.id === 'helados' : cat.id !== 'helados')
                          .map(cat => {
                            const catProds = productos.filter(p => p.categoria === cat.id);
                            if (catProds.length === 0) return null;
                            return (
                              <optgroup key={cat.id} label={cat.name}>
                                {catProds.map(p => (
                                  <option key={p.id} value={p.id}>{p.nombre} ({formatTipo(p.tipo)})</option>
                                ))}
                              </optgroup>
                            );
                          })
                        }
                      </select>
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
                    <div className="form-group">
                      <label>Cantidad Fabricada (unidades)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="form-control"
                        value={prodForm.cantidad}
                        onChange={e => {
                          const val = e.target.value;
                          const qty = parseInt(val) || 0;
                          setProdForm({ ...prodForm, cantidad: val });
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
                        required
                        placeholder="Ej. 5"
                      />
                    </div>

                    {/* Weight Inputs for Helado */}
                    {productos.find(p => p.id === parseInt(prodForm.producto_id))?.categoria === 'helados' && parseInt(prodForm.cantidad) > 0 && (
                      <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                          Pesos Individuales (Balanza)
                        </h4>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                          Envase: <strong style={{color:'var(--text)'}}>{formatTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo)}</strong> | Tara: <strong style={{color:'var(--text)'}}>{getTareByTipo(productos.find(p => p.id === parseInt(prodForm.producto_id))?.tipo).toFixed(3)} kg</strong>
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
                          .filter(l => l.productos && (user.rol === 'heladero' ? l.productos.categoria === 'helados' : l.productos.categoria !== 'helados'))
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
                                      Neto total: <strong style={{color:'var(--success)'}}>{netKilos.toFixed(2)} kg</strong>
                                    </div>
                                  )}
                                </td>
                                <td><strong>{l.cantidad}</strong></td>
                                <td style={{ fontSize: '0.8rem' }}>{new Date(l.fecha_produccion).toLocaleDateString()}</td>
                              </tr>
                            );
                          })
                        }
                        {recentLotes.filter(l => l.productos && (user.rol === 'heladero' ? l.productos.categoria === 'helados' : l.productos.categoria !== 'helados')).length === 0 && (
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
                <h3 className="section-title">Stock Actual en Fábrica (Depósito Principal)</h3>
                
                {user.rol === 'heladero' ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
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

                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sabor / Helado</th>
                            <th style={{ textAlign: 'center' }}>Vasqueta</th>
                            <th style={{ textAlign: 'center' }}>Balde 5k</th>
                            <th style={{ textAlign: 'center' }}>Balde 10k</th>
                            <th>Kilos Netos Totales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const groupedStock = getGroupedStock();
                            const filteredStock = groupedStock.filter(s => stockGroupFilter === 'Todos' || s.group === stockGroupFilter);
                            
                            if (filteredStock.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                    No hay productos en esta categoría con stock en Fábrica.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredStock.map(s => {
                              const wVasqueta = s.vasqueta_id ? getProductNetWeight(s.vasqueta_id, 'vasqueta_5_6k') : 5.5;
                              const wBalde5k = s.balde_4k_id ? getProductNetWeight(s.balde_4k_id, 'balde_4k') : 5.0;
                              const wBalde10k = s.balde_8k_id ? getProductNetWeight(s.balde_8k_id, 'balde_8k') : 10.0;
                              
                              const totalKilos = (s.vasqueta_qty * wVasqueta) + (s.balde_4k_qty * wBalde5k) + (s.balde_8k_qty * wBalde10k);
                              
                              return (
                                <tr key={s.flavor}>
                                  <td>
                                    <strong>{s.flavor}</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                      Categoría: <span className="badge badge-solicitado" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>{s.group}</span>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: s.vasqueta_qty > 0 ? 700 : 400, color: s.vasqueta_qty > 0 ? 'var(--text)' : 'var(--text-light)' }}>
                                    {s.vasqueta_qty}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: s.balde_4k_qty > 0 ? 700 : 400, color: s.balde_4k_qty > 0 ? 'var(--text)' : 'var(--text-light)' }}>
                                    {s.balde_4k_qty}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: s.balde_8k_qty > 0 ? 700 : 400, color: s.balde_8k_qty > 0 ? 'var(--text)' : 'var(--text-light)' }}>
                                    {s.balde_8k_qty}
                                  </td>
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
                        {stockData
                          .filter(s => s.sucursal_id === 1 && s.categoria !== 'helados')
                          .map(s => (
                            <tr key={s.producto_id}>
                              <td><strong>{s.producto_nombre}</strong></td>
                              <td style={{ textTransform: 'capitalize' }}>{formatTipo(s.tipo)}</td>
                              <td style={{ fontWeight: 700, color: s.cantidad > 5 ? 'var(--success)' : 'var(--danger)' }}>
                                {s.cantidad} unidades
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                )}
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
            </div>

            {activeTab === 'pedidos' && (
              <div className="glass-card">
                <h3 className="section-title">Pedidos por Preparar para Despacho</h3>
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
                      {orders.filter(o => o.estado === 'solicitado').map(order => (
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
                      {orders.filter(o => o.estado === 'solicitado').length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                            No hay pedidos pendientes de preparación en este momento.
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
                <h3 className="section-title">Control de Envíos y Carga</h3>
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
                      {orders.map(order => (
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
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                            No tienes viajes activos asignados en este momento.
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
            </div>

            {activeTab === 'pedido_nuevo' && (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Armar Pedido</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                      El sistema calcula sugerencias basadas en tu consumo de los últimos 7 días y tu stock actual.
                    </p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={applyAllSuggestions}>
                    ⚡ Aplicar Sugerencias Inteligentes
                  </button>
                </div>

                {/* Sub-tabs and Search Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar producto o sabor..." 
                      className="form-control"
                      style={{
                        paddingLeft: '2.5rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text)',
                        fontSize: '0.95rem',
                        width: '100%'
                      }}
                      value={orderSearchQuery}
                      onChange={e => setOrderSearchQuery(e.target.value)}
                    />
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
                                <th>Sugerido</th>
                                <th>Pedir Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catSuggestions.map(s => {
                                const requestedQty = orderItems[s.producto_id] || 0;
                                const isExceedingFactoryStock = requestedQty > s.stock_fabrica;
                                
                                return (
                                  <tr key={s.producto_id}>
                                    <td>
                                      <strong>{s.nombre}</strong>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{formatTipo(s.tipo)}</div>
                                      {isExceedingFactoryStock && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                                          ⚠️ Excede stock disponible en Fábrica ({s.stock_fabrica} disponibles)
                                        </div>
                                      )}
                                    </td>
                                    <td>{s.stock_actual}</td>
                                    <td>
                                      <span style={{ 
                                        fontWeight: 600, 
                                        color: s.stock_fabrica > 0 ? 'var(--success)' : 'var(--danger)' 
                                      }}>
                                        {s.stock_fabrica}
                                      </span>
                                    </td>
                                    <td>{s.consumo_promedio_diario}</td>
                                    <td>
                                      <span 
                                        style={{ 
                                          background: 'rgba(0,0,0,0.05)', 
                                          padding: '0.2rem 0.5rem', 
                                          borderRadius: '4px',
                                          fontSize: '0.85rem',
                                          fontWeight: 600,
                                          cursor: s.cantidad_sugerida > 0 ? 'pointer' : 'default'
                                        }}
                                        onClick={() => {
                                          if (s.cantidad_sugerida > 0) {
                                            setOrderItems(prev => ({ ...prev, [s.producto_id]: s.cantidad_sugerida }));
                                          }
                                        }}
                                        title="Haz clic para aplicar individualmente"
                                      >
                                        {s.cantidad_sugerida}
                                      </span>
                                    </td>
                                    <td>
                                      <input 
                                        type="number" 
                                        min="0"
                                        className="form-control"
                                        style={{ width: '80px', padding: '0.4rem' }}
                                        value={orderItems[s.producto_id] || 0}
                                        onChange={e => {
                                          const val = parseInt(e.target.value) || 0;
                                          setOrderItems(prev => ({ ...prev, [s.producto_id]: val }));
                                        }}
                                      />
                                    </td>
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

                <div style={{ marginTop: '2rem' }}>
                  <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading}>
                    Enviar Pedido a Fábrica
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'pedidos_lista' && (
              <div className="glass-card">
                <h3 className="section-title">Pedidos y Envíos Entrantes</h3>
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
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td><span className={getBadgeClass(order.estado)}>{translateState(order.estado)}</span></td>
                          <td>{new Date(order.fecha_solicitud).toLocaleString()}</td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => viewOrderDetail(order.id)}>
                              {order.estado === 'en_transito' || (user.sucursal_id === 4 && order.estado === 'preparado') ? 'Controlar y Recibir' : 'Ver Detalle'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                            No has realizado pedidos aún.
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
                    <select 
                      className="form-control"
                      value={consumoForm.producto_id}
                      onChange={e => setConsumoForm({ ...consumoForm, producto_id: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      {categories.map(cat => {
                        const catProds = productos.filter(p => p.categoria === cat.id);
                        if (catProds.length === 0) return null;
                        return (
                          <optgroup key={cat.id} label={cat.name}>
                            {catProds.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre} ({formatTipo(p.tipo)})</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cantidad Consumida (unidades)</label>
                    <input 
                      type="number" 
                      min="1"
                      className="form-control"
                      value={consumoForm.cantidad}
                      onChange={e => setConsumoForm({ ...consumoForm, cantidad: e.target.value })}
                      required
                      placeholder="Ej. 2"
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
                <h3 className="section-title">Stock Actual en mi Sucursal</h3>
                {categories.map(cat => {
                  const catStock = stockData.filter(s => s.categoria === cat.id);
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
                                  {s.cantidad} unidades
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
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedPedido(null)}>Cerrar</button>
              </div>

              <div style={{ marginBottom: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                <div>
                  <strong>Destino:</strong> {selectedPedido.destino_nombre}<br />
                  <strong>Estado:</strong> <span className={getBadgeClass(selectedPedido.estado)}>{translateState(selectedPedido.estado)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
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
                    {selectedPedido.items.map(it => (
                      <tr key={it.producto_id}>
                        <td><strong>{it.producto_nombre}</strong></td>
                        <td style={{ textAlign: 'center' }}>{it.cantidad_solicitada}</td>
                        {selectedPedido.estado !== 'solicitado' && <td style={{ textAlign: 'center' }}>{it.cantidad_preparada}</td>}
                        {selectedPedido.estado !== 'solicitado' && selectedPedido.estado !== 'preparado' && <td style={{ textAlign: 'center' }}>{it.cantidad_cargada}</td>}
                        {selectedPedido.estado === 'entregado' || selectedPedido.estado === 'con_discrepancia' ? <td style={{ textAlign: 'center' }}>{it.cantidad_recibida}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ACTION: PREPARE ORDER (Transportista / Admin) */}
              {(user.rol === 'transportista' || user.rol === 'admin') && selectedPedido.estado === 'solicitado' && (
                <div>
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
                    Modifica las cantidades si cargas algo diferente a lo preparado. La diferencia volverá al stock de fábrica.
                  </p>
                  
                  <div className="items-selection-grid" style={{ marginBottom: '1.5rem' }}>
                    {selectedPedido.items.map(it => (
                      <div key={it.producto_id} className="item-row" style={{ background: '#f9f9f9', borderRadius: '8px' }}>
                        <div><strong>{it.producto_nombre}</strong></div>
                        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>Preparado: {it.cantidad_preparada}</div>
                        <div>
                          <input 
                            type="number"
                            min="0"
                            max={it.cantidad_preparada}
                            className="form-control"
                            value={loadItems[it.producto_id] ?? it.cantidad_preparada}
                            onChange={e => {
                              const val = Math.min(it.cantidad_preparada, Math.max(0, parseInt(e.target.value) || 0));
                              setLoadItems(prev => ({ ...prev, [it.producto_id]: val }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-secondary" onClick={handleConfirmLoad} disabled={loading} style={{ width: '100%' }}>
                    Confirmar Carga y Salir de Viaje
                  </button>
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

              {/* ACTION: CONFIRM RECEIPT / CROSS-CONFIRMATION (Sucursal Employee) */}
              {user.rol === 'sucursal' && (selectedPedido.estado === 'en_transito' || (user.sucursal_id === 4 && selectedPedido.estado === 'preparado')) && (
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>{user.sucursal_id === 4 ? 'Confirmación de Recepción Interna' : 'Control Cruzado de Recepción Física'}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1.2rem' }}>
                    {user.sucursal_id === 4 
                      ? 'Controla la mercadería retirada directamente de Fábrica. Escribe las cantidades físicas recibidas. Si hay diferencias, detalla el motivo.' 
                      : 'Controla la mercadería junto con el transportista. Escribe cantidades físicas recibidas. Si hay diferencias, detalla el motivo.'}
                  </p>

                  <div className="items-selection-grid" style={{ marginBottom: '1.5rem' }}>
                    {selectedPedido.items.map(it => (
                      <div key={it.producto_id} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong>{it.producto_nombre}</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                            {user.sucursal_id === 4 ? 'Preparado' : 'Despachado'}: <strong>{it.cantidad_cargada}</strong>
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', alignItems: 'center' }}>
                          <input 
                            type="number"
                            min="0"
                            className="form-control"
                            placeholder="Recibido"
                            value={receiveItems[it.producto_id] ?? it.cantidad_cargada}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setReceiveItems(prev => ({ ...prev, [it.producto_id]: val }));
                            }}
                          />
                          
                          {(receiveItems[it.producto_id] ?? it.cantidad_cargada) !== it.cantidad_cargada && (
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
                    ))}
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
                  <input 
                    type="number"
                    min="1"
                    className="form-control"
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

      </main>
      
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
