import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatQuantity, formatTipo, formatDate } from '../../utils/formatters';

const AdminSuppliersView = () => {
  const {
    setEditingProv,
    setProvForm,
    setShowProvModal,
    proveedores,
    handleProvDelete,
    showProvModal,
    editingProv,
    handleProvSubmit,
    provForm,
    clientes = [],
    stockClientes = [],
    editingCliente,
    setEditingCliente,
    showClienteModal,
    setShowClienteModal,
    clienteForm,
    setClienteForm,
    handleClienteSubmit,
    handleClienteDelete,
    handleAdjustClienteStock,
    recentLotes = [],
    productos = [],
    categories = [],
    getTareByTipo,
    loading
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState('proveedores'); // 'proveedores' | 'clientes'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState('all');
  const [analysisCategory, setAnalysisCategory] = useState('Todos');
  const [analysisViewMode, setAnalysisViewMode] = useState('analisis'); // 'analisis' | 'stock' | 'lotes'
  const [adjustingStockItem, setAdjustingStockItem] = useState(null);
  const [adjustNewQty, setAdjustNewQty] = useState('');

  // Filtrado de proveedores
  const filteredProveedores = useMemo(() => {
    if (!searchQuery.trim()) return proveedores;
    const q = searchQuery.toLowerCase();
    return proveedores.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.cuit?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.telefono?.toLowerCase().includes(q)
    );
  }, [proveedores, searchQuery]);

  // Filtrado de clientes
  const filteredClientes = useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    const q = searchQuery.toLowerCase();
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.cuit?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    );
  }, [clientes, searchQuery]);

  // Lotes asociados a clientes
  const clientLotes = useMemo(() => {
    return (recentLotes || []).filter(l => {
      if (!l.cliente_id) return false;
      if (selectedClienteId !== 'all' && Number(l.cliente_id) !== Number(selectedClienteId)) return false;
      const prod = l.productos || productos.find(p => p.id === l.producto_id);
      if (analysisCategory !== 'Todos' && prod?.categoria !== analysisCategory) return false;
      return true;
    });
  }, [recentLotes, selectedClienteId, analysisCategory, productos]);

  // Stock propio filtrado por cliente seleccionado y categoría
  const filteredClientStock = useMemo(() => {
    return (stockClientes || [])
      .filter(sc => {
        if (selectedClienteId !== 'all' && Number(sc.cliente_id) !== Number(selectedClienteId)) return false;
        const prod = sc.productos || productos.find(p => p.id === sc.producto_id);
        if (analysisCategory !== 'Todos' && prod?.categoria !== analysisCategory) return false;
        return Number(sc.cantidad) > 0;
      })
      .map(sc => {
        const prod = sc.productos || productos.find(p => p.id === sc.producto_id);
        const cli = sc.clientes || clientes.find(c => c.id === sc.cliente_id);
        return {
          ...sc,
          producto_obj: prod,
          producto_nombre: prod?.nombre || `Producto #${sc.producto_id}`,
          categoria: prod?.categoria || '',
          tipo: prod?.tipo || '',
          unidad_medida: prod?.unidad_medida || 'unidad',
          cliente_nombre: cli?.nombre || `Cliente #${sc.cliente_id}`
        };
      })
      .sort((a, b) => Number(b.cantidad) - Number(a.cantidad));
  }, [stockClientes, selectedClienteId, analysisCategory, productos, clientes]);

  // Ranking y análisis de qué sabores de helado o productos compra cada cliente
  const productPurchaseAnalysis = useMemo(() => {
    const map = {};

    // 1. Sumar desde el historial de lotes producidos para el cliente
    clientLotes.forEach(l => {
      const prod = l.productos || productos.find(p => p.id === l.producto_id);
      const cli = clientes.find(c => c.id === l.cliente_id);
      const key = `${l.cliente_id}_${l.producto_id}`;
      if (!map[key]) {
        map[key] = {
          key,
          cliente_id: l.cliente_id,
          cliente_nombre: cli?.nombre || `Cliente #${l.cliente_id}`,
          producto_id: l.producto_id,
          producto_obj: prod,
          producto_nombre: prod?.nombre || `Producto #${l.producto_id}`,
          categoria: prod?.categoria || '',
          tipo: prod?.tipo || '',
          lotes_count: 0,
          total_producido: 0,
          stock_actual: 0,
          ultima_fecha: l.fecha_produccion
        };
      }
      map[key].lotes_count += 1;
      map[key].total_producido += Number(l.cantidad) || 0;
      if (l.fecha_produccion && (!map[key].ultima_fecha || new Date(l.fecha_produccion) > new Date(map[key].ultima_fecha))) {
        map[key].ultima_fecha = l.fecha_produccion;
      }
    });

    // 2. Cruzar con el stock propio actual del cliente (por si tiene stock inicial o ajustado)
    filteredClientStock.forEach(sc => {
      const key = `${sc.cliente_id}_${sc.producto_id}`;
      if (!map[key]) {
        map[key] = {
          key,
          cliente_id: sc.cliente_id,
          cliente_nombre: sc.cliente_nombre,
          producto_id: sc.producto_id,
          producto_obj: sc.producto_obj,
          producto_nombre: sc.producto_nombre,
          categoria: sc.categoria,
          tipo: sc.tipo,
          lotes_count: 0,
          total_producido: Number(sc.cantidad) || 0,
          stock_actual: Number(sc.cantidad) || 0,
          ultima_fecha: sc.updated_at
        };
      } else {
        map[key].stock_actual = Number(sc.cantidad) || 0;
      }
    });

    const list = Object.values(map).sort((a, b) => b.total_producido - a.total_producido);
    const maxVal = list.reduce((acc, item) => Math.max(acc, item.total_producido), 0);
    return list.map(item => ({
      ...item,
      share_pct: maxVal > 0 ? Math.round((item.total_producido / maxVal) * 100) : 0
    }));
  }, [clientLotes, filteredClientStock, productos, clientes]);

  return (
    <div className="glass-card fade-in">
      {/* Cabecera principal y selector entre Proveedores y Clientes */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, border: 'none' }}>
            {activeSubTab === 'proveedores' ? 'Gestión de Proveedores' : 'Gestión de Clientes y Stock Propio'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
            {activeSubTab === 'proveedores'
              ? 'Administra los proveedores de insumos y mercadería de fábrica.'
              : 'Administra clientes específicos con stock propio separado del de fábrica y eventos, y analiza qué sabores o productos compran.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.04)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.08)'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === 'proveedores' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.85rem', minHeight: 'unset' }}
              onClick={() => setActiveSubTab('proveedores')}
            >
              🏭 Proveedores ({proveedores.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === 'clientes' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.85rem', minHeight: 'unset' }}
              onClick={() => setActiveSubTab('clientes')}
            >
              🤝 Clientes ({clientes.length})
            </button>
          </div>

          {activeSubTab === 'proveedores' ? (
            <button className="btn btn-primary" onClick={() => {
              setEditingProv(null);
              setProvForm({
                nombre: '',
                cuit: '',
                telefono: '',
                direccion: '',
                email: ''
              });
              setShowProvModal(true);
            }}>
              ➕ Nuevo Proveedor
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => {
              setEditingCliente(null);
              setClienteForm({
                nombre: '',
                cuit: '',
                telefono: '',
                direccion: '',
                email: ''
              });
              setShowClienteModal(true);
            }}>
              ➕ Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Buscador común */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder={activeSubTab === 'proveedores'
            ? '🔍 Buscar proveedor por nombre, CUIT, teléfono o email...'
            : '🔍 Buscar cliente por nombre, CUIT, teléfono o email...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '460px' }}
        />
      </div>

      {/* ==================== VISTA 1: PROVEEDORES ==================== */}
      {activeSubTab === 'proveedores' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>CUIT</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Dirección</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.cuit || '-'}</td>
                  <td>{p.telefono || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td>{p.direccion || '-'}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => {
                        setEditingProv(p);
                        setProvForm({
                          nombre: p.nombre,
                          cuit: p.cuit || '',
                          telefono: p.telefono || '',
                          direccion: p.direccion || '',
                          email: p.email || ''
                        });
                        setShowProvModal(true);
                      }}
                    >
                      Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleProvDelete(p.id, p.nombre)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProveedores.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                    No hay proveedores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== VISTA 2: CLIENTES Y STOCK PROPIO ==================== */}
      {activeSubTab === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Tabla de Clientes */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Stock Propio Actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map(c => {
                  const clientStockRows = (stockClientes || []).filter(sc => Number(sc.cliente_id) === Number(c.id) && Number(sc.cantidad) > 0);
                  const totalLotesCount = (recentLotes || []).filter(l => Number(l.cliente_id) === Number(c.id)).length;
                  const isSelected = Number(selectedClienteId) === Number(c.id);

                  return (
                    <tr key={c.id} style={isSelected ? { background: 'hsla(24, 85%, 55%, 0.08)' } : undefined}>
                      <td>{c.id}</td>
                      <td>
                        <strong>{c.nombre}</strong>
                        {c.direccion && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>📍 {c.direccion}</div>
                        )}
                      </td>
                      <td>{c.cuit || '-'}</td>
                      <td>{c.telefono || '-'}</td>
                      <td>{c.email || '-'}</td>
                      <td>
                        <span className="badge badge-preparado" style={{ marginRight: '0.4rem' }}>
                          📦 {clientStockRows.length} prod. en stock
                        </span>
                        <span className="badge badge-solicitado">
                          🧾 {totalLotesCount} lotes
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setSelectedClienteId(isSelected ? 'all' : String(c.id))}
                          >
                            📊 {isSelected ? 'Viendo Análisis' : 'Analizar Compras / Stock'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingCliente(c);
                              setClienteForm({
                                nombre: c.nombre,
                                cuit: c.cuit || '',
                                telefono: c.telefono || '',
                                direccion: c.direccion || '',
                                email: c.email || ''
                              });
                              setShowClienteModal(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleClienteDelete(c.id, c.nombre)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredClientes.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                      No hay clientes registrados todavía. Haz clic en "➕ Nuevo Cliente" para agregar el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Panel de Análisis de Sabores/Productos y Stock Propio por Cliente */}
          <div className="glass-card" style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.015)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              paddingBottom: '0.85rem'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  📊 Stock Propio y Análisis de Sabores / Productos por Cliente
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                  Visualiza el stock separado de cada cliente y analiza qué sabores de helado o productos de pastelería compra con mayor frecuencia.
                </p>
              </div>

              {/* Filtros del panel de análisis */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ minWidth: '210px', padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
                  value={selectedClienteId}
                  onChange={e => setSelectedClienteId(e.target.value)}
                >
                  <option value="all">👤 Todos los Clientes</option>
                  {clientes.map(c => (
                    <option key={c.id} value={String(c.id)}>👤 {c.nombre}</option>
                  ))}
                </select>

                <select
                  className="form-control"
                  style={{ minWidth: '170px', padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
                  value={analysisCategory}
                  onChange={e => setAnalysisCategory(e.target.value)}
                >
                  <option value="Todos">Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-selector de modo de visualización */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${analysisViewMode === 'analisis' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAnalysisViewMode('analisis')}
              >
                📈 Sabores y Productos que Compra ({productPurchaseAnalysis.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${analysisViewMode === 'stock' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAnalysisViewMode('stock')}
              >
                📦 Stock Propio Disponible ({filteredClientStock.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${analysisViewMode === 'lotes' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAnalysisViewMode('lotes')}
              >
                🧾 Historial de Lotes Cargados ({clientLotes.length})
              </button>
            </div>

            {/* MODO 1: Ranking de sabores y productos que compra */}
            {analysisViewMode === 'analisis' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Producto / Sabor</th>
                      <th>Formato / Categoría</th>
                      <th>Lotes Cargados</th>
                      <th>Total Producido / Comprado</th>
                      <th>En Stock del Cliente</th>
                      <th>Preferencia</th>
                      <th>Última Carga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPurchaseAnalysis.map(item => (
                      <tr key={item.key}>
                        <td><strong>{item.cliente_nombre}</strong></td>
                        <td><strong>{item.producto_nombre}</strong></td>
                        <td style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {formatTipo(item.tipo) || item.categoria?.replace(/_/g, ' ')}
                        </td>
                        <td>{item.lotes_count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {formatQuantity(item.total_producido, {
                            ...item.producto_obj,
                            unidad_medida: item.categoria === 'helados' ? 'peso' : item.producto_obj?.unidad_medida
                          })}
                        </td>
                        <td style={{ fontWeight: 600, color: item.stock_actual > 0 ? 'var(--success)' : 'var(--text-light)' }}>
                          {formatQuantity(item.stock_actual, {
                            ...item.producto_obj,
                            unidad_medida: item.categoria === 'helados' ? 'peso' : item.producto_obj?.unidad_medida
                          })}
                        </td>
                        <td style={{ minWidth: '120px' }}>
                          <div style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.08)',
                            height: '8px',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${item.share_pct}%`,
                              background: 'var(--primary)',
                              height: '100%'
                            }} />
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{item.ultima_fecha ? formatDate(item.ultima_fecha) : '-'}</td>
                      </tr>
                    ))}
                    {productPurchaseAnalysis.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                          Aún no hay cargas de producción registradas para el filtro seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODO 2: Stock propio actual del cliente */}
            {analysisViewMode === 'stock' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Producto / Sabor</th>
                      <th>Formato</th>
                      <th>Cantidad Disponible</th>
                      <th>Última Actualización</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientStock.map(sc => (
                      <tr key={sc.id || `${sc.cliente_id}-${sc.producto_id}`}>
                        <td><strong>{sc.cliente_nombre}</strong></td>
                        <td><strong>{sc.producto_nombre}</strong></td>
                        <td style={{ textTransform: 'capitalize' }}>{formatTipo(sc.tipo)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {formatQuantity(sc.cantidad, {
                            ...sc.producto_obj,
                            unidad_medida: sc.categoria === 'helados' ? 'peso' : sc.unidad_medida
                          })}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{sc.updated_at ? formatDate(sc.updated_at) : '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setAdjustingStockItem(sc);
                              setAdjustNewQty(String(sc.cantidad));
                            }}
                          >
                            ✏️ Ajustar / Entregar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredClientStock.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                          No hay stock propio disponible para el cliente seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODO 3: Historial detallado de lotes cargados para el cliente */}
            {analysisViewMode === 'lotes' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Cliente</th>
                      <th>Producto / Sabor</th>
                      <th>Pesos / Detalle</th>
                      <th>Cantidad Neta</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientLotes.map(l => {
                      const cli = clientes.find(c => c.id === l.cliente_id);
                      const tareVal = l.productos ? getTareByTipo(l.productos.tipo) : 0;
                      const netKilos = l.pesos ? l.pesos.reduce((acc, curr) => acc + Math.max(0, parseFloat(curr) - tareVal), 0) : 0;
                      return (
                        <tr key={l.id}>
                          <td><code>{l.codigo_lote}</code></td>
                          <td><strong>{cli?.nombre || `Cliente #${l.cliente_id}`}</strong></td>
                          <td>
                            <strong>{l.productos?.nombre}</strong>{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              ({formatTipo(l.productos?.tipo)})
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            {l.pesos && l.pesos.length > 0
                              ? `${l.pesos.map(w => `${parseFloat(w).toFixed(2)}kg`).join(', ')} (Neto: ${netKilos.toFixed(2)} kg)`
                              : '-'}
                          </td>
                          <td>
                            <strong>
                              {formatQuantity(l.cantidad, {
                                ...l.productos,
                                unidad_medida: l.productos?.categoria === 'helados' ? 'peso' : l.productos?.unidad_medida
                              })}
                            </strong>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{formatDate(l.fecha_produccion)}</td>
                        </tr>
                      );
                    })}
                    {clientLotes.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 1rem' }}>
                          No hay lotes registrados para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: PROVEEDOR ==================== */}
      {showProvModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1100, padding: '1rem',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => setShowProvModal(false)}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{
            maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.95)', color: '#000',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
              <h3 className="section-title" style={{ margin: 0, color: 'var(--text-dark)' }}>
                {editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                onClick={() => setShowProvModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleProvSubmit} className="form-grid">
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Nombre *</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.nombre} onChange={e => setProvForm({
                  ...provForm,
                  nombre: e.target.value
                })} required />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>CUIT (Opcional)</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.cuit} onChange={e => setProvForm({
                  ...provForm,
                  cuit: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Teléfono (Opcional)</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.telefono} onChange={e => setProvForm({
                  ...provForm,
                  telefono: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Email (Opcional)</label>
                <input type="email" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.email} onChange={e => setProvForm({
                  ...provForm,
                  email: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Dirección (Opcional)</label>
                <textarea className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={provForm.direccion} onChange={e => setProvForm({
                  ...provForm,
                  direccion: e.target.value
                })} rows="2"></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className="btn btn-outline" style={{ flex: 1, borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }} onClick={() => setShowProvModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CLIENTE ==================== */}
      {showClienteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1100, padding: '1rem',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => setShowClienteModal(false)}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{
            maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.95)', color: '#000',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.8rem' }}>
              <h3 className="section-title" style={{ margin: 0, color: 'var(--text-dark)' }}>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente con Stock Propio'}
              </h3>
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }}
                onClick={() => setShowClienteModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleClienteSubmit} className="form-grid">
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Nombre / Razón Social *</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={clienteForm.nombre} onChange={e => setClienteForm({
                  ...clienteForm,
                  nombre: e.target.value
                })} required />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>CUIT (Opcional)</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={clienteForm.cuit} onChange={e => setClienteForm({
                  ...clienteForm,
                  cuit: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Teléfono (Opcional)</label>
                <input type="text" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={clienteForm.telefono} onChange={e => setClienteForm({
                  ...clienteForm,
                  telefono: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Email (Opcional)</label>
                <input type="email" className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={clienteForm.email} onChange={e => setClienteForm({
                  ...clienteForm,
                  email: e.target.value
                })} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-dark)' }}>Dirección (Opcional)</label>
                <textarea className="form-control" style={{ border: '1px solid rgba(0,0,0,0.15)' }} value={clienteForm.direccion} onChange={e => setClienteForm({
                  ...clienteForm,
                  direccion: e.target.value
                })} rows="2"></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cliente'}
                </button>
                <button type="button" className="btn btn-outline" style={{ flex: 1, borderColor: 'rgba(0,0,0,0.2)', color: 'var(--text-dark)' }} onClick={() => setShowClienteModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: AJUSTAR STOCK DE CLIENTE ==================== */}
      {adjustingStockItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1100, padding: '1rem',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => setAdjustingStockItem(null)}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{
            maxWidth: '420px', width: '100%', background: 'rgba(255, 255, 255, 0.98)', color: '#000'
          }}>
            <h4 style={{ marginTop: 0, color: 'var(--text-dark)' }}>Ajustar Stock Propio del Cliente</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-light)' }}>
              <strong>Cliente:</strong> {adjustingStockItem.cliente_nombre}<br />
              <strong>Producto:</strong> {adjustingStockItem.producto_nombre} ({formatTipo(adjustingStockItem.tipo)})
            </p>
            <div className="form-group">
              <label style={{ color: 'var(--text-dark)' }}>
                Nueva cantidad disponible ({adjustingStockItem.categoria === 'helados' || adjustingStockItem.unidad_medida === 'peso' ? 'kg' : 'unidades'})
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="form-control"
                value={adjustNewQty}
                onChange={e => setAdjustNewQty(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setAdjustingStockItem(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || adjustNewQty === '' || isNaN(Number(adjustNewQty)) || Number(adjustNewQty) < 0}
                onClick={async () => {
                  await handleAdjustClienteStock(adjustingStockItem.cliente_id, adjustingStockItem.producto_id, Number(adjustNewQty));
                  setAdjustingStockItem(null);
                }}
              >
                Guardar Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliersView;
