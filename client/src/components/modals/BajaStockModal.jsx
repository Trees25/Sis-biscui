import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity, normalizeWeight } from '../../utils/formatters';
import { MOTIVOS_BAJA_STOCK } from '../../utils/validators';

const BajaStockModal = () => {
  const {
    showBajaModal,
    setShowBajaModal,
    bajaForm,
    setBajaForm,
    handleRegistrarBajaStock,
    productos,
    categories,
    stockData,
    sucursales,
    user,
    loading
  } = useData();

  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredProducts = useMemo(() => {
    let prods = productos || [];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      prods = prods.filter(p => p.nombre.toLowerCase().includes(q) || (p.tipo && formatTipo(p.tipo).toLowerCase().includes(q)));
    }
    return prods;
  }, [productos, searchFilter]);

  if (!showBajaModal) return null;

  const targetSucursalId = parseInt(bajaForm.sucursal_id, 10) || user?.sucursal_id || 1;
  const currentBranch = sucursales.find(s => s.id === targetSucursalId);
  const selectedProd = productos.find(p => p.id === parseInt(bajaForm.producto_id, 10));

  const isWeight = selectedProd?.unidad_medida === 'peso' || selectedProd?.categoria === 'helados' || selectedProd?.categoria?.toLowerCase().includes('fruta') || selectedProd?.categoria?.toLowerCase().includes('verdura');

  // Obtener stock actual disponible en esta sucursal
  const stockItem = (stockData || []).find(
    s => s.producto_id === (selectedProd?.id || 0) &&
         s.sucursal_id === targetSucursalId &&
         Boolean(s.es_evento) === Boolean(bajaForm.es_evento)
  );
  const stockActual = stockItem ? Number(stockItem.cantidad) : 0;

  const numCantidad = isWeight ? normalizeWeight(bajaForm.cantidad) : Number(bajaForm.cantidad || 0);
  const nuevoStock = Math.max(0, Number((stockActual - (numCantidad || 0)).toFixed(3)));
  const isExceeded = numCantidad > stockActual && stockActual > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!bajaForm.producto_id) {
      setErrorMsg('Debes seleccionar un producto o sabor.');
      return;
    }
    if (!numCantidad || numCantidad <= 0) {
      setErrorMsg('Ingresa una cantidad mayor a 0 para dar de baja.');
      return;
    }
    if (stockActual <= 0) {
      setErrorMsg('No hay stock disponible registrado de este producto en la sucursal.');
      return;
    }
    if (numCantidad > stockActual) {
      setErrorMsg(`La cantidad a dar de baja (${numCantidad}) supera el stock disponible (${stockActual}).`);
      return;
    }

    try {
      await handleRegistrarBajaStock({
        sucursal_id: targetSucursalId,
        producto_id: parseInt(bajaForm.producto_id, 10),
        cantidad: numCantidad,
        motivo: bajaForm.motivo || 'vencimiento',
        observaciones: bajaForm.observaciones || '',
        es_evento: Boolean(bajaForm.es_evento)
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la baja de stock.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1200,
      padding: '1rem',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--card-bg, #ffffff)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(220, 53, 69, 0.3)'
      }}>
        {/* Encabezado */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <span>🗑️</span> Baja de Stock / Descarte
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
              Ubicación: <strong>{currentBranch?.nombre || 'Sucursal'}</strong>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowBajaModal(false)}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(231, 76, 60, 0.12)',
            color: '#c0392b',
            padding: '0.65rem 0.9rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            border: '1px solid rgba(231, 76, 60, 0.3)'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Selector de Sucursal (Solo para admin si desea cambiar) */}
          {user?.rol === 'admin' && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sucursal afectada</label>
              <select
                className="form-control"
                value={bajaForm.sucursal_id || targetSucursalId}
                onChange={e => setBajaForm({ ...bajaForm, sucursal_id: e.target.value })}
              >
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Producto / Sabor */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sabor / Producto a dar de baja</label>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Buscar producto por nombre..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ marginBottom: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
            />
            <select
              className="form-control"
              value={bajaForm.producto_id || ''}
              onChange={e => setBajaForm({ ...bajaForm, producto_id: e.target.value })}
              required
            >
              <option value="">-- Seleccionar Producto / Sabor --</option>
              {categories.map(cat => {
                const catProds = filteredProducts.filter(p => p.categoria === cat.id);
                if (catProds.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={cat.name}>
                    {catProds.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.tipo ? `(${formatTipo(p.tipo)})` : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Banner de Stock Actual y Previsualización */}
          {selectedProd && (
            <div style={{
              background: 'rgba(0,0,0,0.03)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              border: '1px solid rgba(0,0,0,0.06)',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Stock actual en sucursal:</span>
                <strong>{formatQuantity(stockActual, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</strong>
              </div>
              {numCantidad > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: isExceeded ? 'var(--danger)' : '#27ae60', fontWeight: 600 }}>
                  <span>Stock resultante tras la baja:</span>
                  <span>{formatQuantity(nuevoStock, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</span>
                </div>
              )}
              {isExceeded && (
                <p style={{ margin: '0.4rem 0 0 0', color: 'var(--danger)', fontSize: '0.78rem' }}>
                  ⚠️ La cantidad a dar de baja supera el stock registrado disponible.
                </p>
              )}
            </div>
          )}

          {/* Cantidad a eliminar */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Cantidad a dar de baja ({isWeight ? 'kg' : 'unidades'})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step={isWeight ? "0.001" : "1"}
                min="0.001"
                max="100000"
                className="form-control"
                placeholder={isWeight ? "Ej. 4.500 (o 4500)" : "Ej. 2"}
                value={bajaForm.cantidad || ''}
                onChange={e => setBajaForm({ ...bajaForm, cantidad: e.target.value })}
                onBlur={e => {
                  if (isWeight && e.target.value !== '') {
                    setBajaForm({ ...bajaForm, cantidad: normalizeWeight(e.target.value) });
                  }
                }}
                style={{ fontSize: '1.05rem', fontWeight: 700 }}
                required
              />
              <span style={{ fontWeight: 600, color: 'var(--text-light)', minWidth: '35px' }}>
                {isWeight ? 'kg' : 'u'}
              </span>
            </div>
            {isWeight && (
              <small style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                💡 Puedes ingresar gramos (ej: <code>4500</code> = 4.500 kg) o kilos directos con punto/coma.
              </small>
            )}
          </div>

          {/* Motivo de la baja */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Motivo del descarte / baja</label>
            <select
              className="form-control"
              value={bajaForm.motivo || 'vencimiento'}
              onChange={e => setBajaForm({ ...bajaForm, motivo: e.target.value })}
              required
            >
              {MOTIVOS_BAJA_STOCK.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Observaciones detalladas */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Observaciones del lote / Incidencia (opcional pero recomendado)
            </label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Ej: Lote L-202611-1234 venció ayer. Sabor ácido o cristalizado. Descongelado por corte de luz nocturno."
              value={bajaForm.observaciones || ''}
              onChange={e => setBajaForm({ ...bajaForm, observaciones: e.target.value })}
              maxLength={500}
              style={{ fontSize: '0.85rem' }}
            />
            <small style={{ color: 'var(--text-light)', fontSize: '0.72rem', float: 'right', marginTop: '0.15rem' }}>
              {(bajaForm.observaciones || '').length}/500
            </small>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowBajaModal(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || isExceeded || !numCantidad || numCantidad <= 0 || stockActual <= 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {loading ? 'Procesando...' : '🗑️ Confirmar Baja y Restar Kilos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BajaStockModal;

