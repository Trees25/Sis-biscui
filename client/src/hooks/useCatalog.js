import { useState } from 'react';

export const useCatalog = () => {
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProv, setEditingProv] = useState(null);
  const [showProvModal, setShowProvModal] = useState(false);
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Todos');
  const [catalogSupplier, setCatalogSupplier] = useState('');
  const [catalogFormat, setCatalogFormat] = useState('Todos');
  const [catalogStatus, setCatalogStatus] = useState('Todos');

  return {
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
  };
};
