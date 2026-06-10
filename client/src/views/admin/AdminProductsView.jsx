import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo, getLocalDateString } from '../../utils/formatters';
const AdminProductsView = () => {
  const {
    productos,
    categories,
    proveedores,
    recentLotes,
    adminCatalogSearch,
    setAdminCatalogSearch,
    adminCatalogCategoryFilter,
    setAdminCatalogCategoryFilter,
    adminCatalogSupplierFilter,
    setAdminCatalogSupplierFilter,
    adminCatalogStatusFilter,
    setAdminCatalogStatusFilter,
    cancelEditingProduct,
    setShowProductModal,
    handleToggleProductActive,
    handleEditProduct,
    handleDeleteProduct,
    fetchProductLotes,
    showLotesModal,
    setShowLotesModal,
    selectedProductLotes,
    newLote,
    setNewLote,
    handleAddLote,
    handleDeleteLote,
    editingLote,
    setEditingLote,
    handleUpdateLote,
    getProductNetWeight,
    getTareByTipo
  } = useData();
  return <>
              <AdminProductsView productos={productos} categories={categories} proveedores={proveedores} recentLotes={recentLotes} adminCatalogSearch={adminCatalogSearch} setAdminCatalogSearch={setAdminCatalogSearch} adminCatalogCategoryFilter={adminCatalogCategoryFilter} setAdminCatalogCategoryFilter={setAdminCatalogCategoryFilter} adminCatalogSupplierFilter={adminCatalogSupplierFilter} setAdminCatalogSupplierFilter={setAdminCatalogSupplierFilter} adminCatalogStatusFilter={adminCatalogStatusFilter} setAdminCatalogStatusFilter={setAdminCatalogStatusFilter} cancelEditingProduct={cancelEditingProduct} setShowProductModal={setShowProductModal} handleToggleProductActive={handleToggleProductActive} handleEditProduct={handleEditProduct} handleDeleteProduct={handleDeleteProduct} fetchProductLotes={fetchProductLotes} showLotesModal={showLotesModal} setShowLotesModal={setShowLotesModal} selectedProductLotes={selectedProductLotes} newLote={newLote} setNewLote={setNewLote} handleAddLote={handleAddLote} handleDeleteLote={handleDeleteLote} editingLote={editingLote} setEditingLote={setEditingLote} handleUpdateLote={handleUpdateLote} getProductNetWeight={getProductNetWeight} getTareByTipo={getTareByTipo} />
    </>;
};
export default AdminProductsView;