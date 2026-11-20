import { useState } from 'react';

export const useStock = () => {
  const [stockData, setStockData] = useState([]);
  const [adminStockMatriz, setAdminStockMatriz] = useState([]);
  const [stockGroupFilter, setStockGroupFilter] = useState('Todos');
  const [iceCreamFormatFilter, setIceCreamFormatFilter] = useState('Todos'); 
  const [adminStockTab, setAdminStockTab] = useState('helados');
  const [adminStockSearch, setAdminStockSearch] = useState('');
  const [factoryStockSearch, setFactoryStockSearch] = useState('');
  const [branchStockSearch, setBranchStockSearch] = useState('');
  const [showEventStock, setShowEventStock] = useState(false);
  const [showEventStockDepot, setShowEventStockDepot] = useState(false);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [adminStockSupplierFilter, setAdminStockSupplierFilter] = useState('');
  
  // Bajas de stock (vencimiento, mal estado, rotura, etc.)
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [bajaForm, setBajaForm] = useState({
    producto_id: '',
    sucursal_id: '',
    cantidad: '',
    motivo: 'vencimiento',
    observaciones: '',
    es_evento: false
  });
  const [bajasList, setBajasList] = useState([]);

  // Devoluciones de helado a fábrica desde sucursales
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [devolucionForm, setDevolucionForm] = useState({
    producto_id: '',
    sucursal_origen_id: '',
    cantidad: '',
    motivo: 'rotacion_sabor',
    observaciones: '',
    es_evento: false
  });
  const [devolucionesList, setDevolucionesList] = useState([]);
  
  const [editStockForm, setEditStockForm] = useState({
    producto_id: '',
    sucursal_id: '',
    cantidad: '',
    es_evento: false
  });
  
  const [editStockItemDetails, setEditStockItemDetails] = useState({
    producto_nombre: '',
    sucursal_nombre: ''
  });

  return {
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
    showBajaModal, setShowBajaModal,
    bajaForm, setBajaForm,
    bajasList, setBajasList,
    showDevolucionModal, setShowDevolucionModal,
    devolucionForm, setDevolucionForm,
    devolucionesList, setDevolucionesList,
    editStockForm, setEditStockForm,
    editStockItemDetails, setEditStockItemDetails,
    adminStockSupplierFilter, setAdminStockSupplierFilter
  };
};
