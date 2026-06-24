import { useData } from '../../context/DataContext';
import React from 'react';
import { formatTipo } from '../../utils/formatters';

const AdminProductsView = () => {
  const { allProducts, categories, proveedores, catalogSearch, setCatalogSearch, catalogCategory, setCatalogCategory, catalogSupplier, setCatalogSupplier, catalogStatus, setCatalogStatus, catalogFormat, setCatalogFormat, cancelEditingProduct, setShowProductModal, showProductModal, handleToggleProductActive, startEditingProduct, loading, editingProduct, handleProductFormSubmit, newProductForm, setNewProductForm, handleCategoriaChange, getTiposPorCategoria, showSupplierForm, setShowSupplierForm, newSupplierName, setNewSupplierName, handleCreateSupplier } = useData();

  return (
    <>
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
                      { id: 'Todos', label: '📋 Todos' },
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
                                      🗑️ Desactivar
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-success"
                                      style={{ padding: '0.25rem 0.5rem', minHeight: 'unset', fontSize: '0.75rem', background: 'var(--success)' }}
                                      onClick={() => handleToggleProductActive(p.id, p.activo)}
                                      disabled={loading}
                                      title="Reactivar"
                                    >
                                      ✅ Reactivar
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

                      <form onSubmit={handleProductFormSubmit} className="form-grid">
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
                              ➕
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
                          <div className="modal-overlay" onClick={() => setShowSupplierForm(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                              <h3 className="section-title" style={{ marginTop: 0 }}>➕ Nuevo Proveedor</h3>
                              <div className="form-group">
                                <label>Nombre del proveedor *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={newSupplierName}
                                  onChange={e => setNewSupplierName(e.target.value)}
                                  placeholder="Ej: Distribuidora Norte..."
                                  autoFocus
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={handleCreateSupplier}
                                  disabled={loading || !newSupplierName.trim()}
                                  style={{ flex: 1 }}
                                >
                                  {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setShowSupplierForm(false);
                                    setNewSupplierName('');
                                  }}
                                  style={{ flex: 1 }}
                                >
                                  Cancelar
                                </button>
                              </div>
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
    </>
  );
};

export default AdminProductsView;
