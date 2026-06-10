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
    editStockForm, setEditStockForm,
    editStockItemDetails, setEditStockItemDetails,
    adminStockSupplierFilter, setAdminStockSupplierFilter
  };
};
