import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity, normalizeWeight } from '../../utils/formatters';
import { MOTIVOS_DEVOLUCION_FABRICA } from '../../utils/validators';

const DevolucionFabricaModal = () => {
  const {
    showDevolucionModal,
    setShowDevolucionModal,
    devolucionForm,
    setDevolucionForm,
    handleRegistrarDevolucionFabrica,
    productos,
    categories,
    stockData,
    sucursales,
    user,
    loading
  } = useData();

  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const availableProducts = useMemo(() => {
    let prods = productos || [];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      prods = prods.filter(p => p.nombre.toLowerCase().includes(q) || (p.tipo && formatTipo(p.tipo).toLowerCase().includes(q)));
    }
    return prods;
  }, [productos, searchFilter]);

  if (!showDevolucionModal) return null;

  const targetOrigenId = parseInt(devolucionForm.sucursal_origen_id, 10) || user?.sucursal_id || 2;
  const origenBranch = sucursales.find(s => s.id === targetOrigenId);
  const selectedProd = productos.find(p => p.id === parseInt(devolucionForm.producto_id, 10));

  const isWeight = selectedProd?.unidad_medida === 'peso' || selectedProd?.categoria === 'helados' || selectedProd?.categoria?.toLowerCase().includes('fruta') || selectedProd?.categoria?.toLowerCase().includes('verdura');

  // Stock actual en la sucursal de origen
  const stockItemOrigen = (stockData || []).find(
    s => s.producto_id === (selectedProd?.id || 0) &&
         s.sucursal_id === targetOrigenId &&
         Boolean(s.es_evento) === Boolean(devolucionForm.es_evento)
  );
  const stockActualOrigen = stockItemOrigen ? Number(stockItemOrigen.cantidad) : 0;

  // Stock actual en fábrica (depósito 1)
  const stockItemFabrica = (stockData || []).find(
    s => s.producto_id === (selectedProd?.id || 0) &&
         s.sucursal_id === 1 &&
         Boolean(s.es_evento) === Boolean(devolucionForm.es_evento)
  );
  const stockActualFabrica = stockItemFabrica ? Number(stockItemFabrica.cantidad) : 0;

  const numCantidad = isWeight ? normalizeWeight(devolucionForm.cantidad) : Number(devolucionForm.cantidad || 0);
  const nuevoStockOrigen = Math.max(0, Number((stockActualOrigen - (numCantidad || 0)).toFixed(3)));
  const nuevoStockFabrica = Number((stockActualFabrica + (numCantidad || 0)).toFixed(3));
  const isExceeded = numCantidad > stockActualOrigen && stockActualOrigen > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (targetOrigenId === 1) {
      setErrorMsg('Fábrica no puede realizar una devolución hacia sí misma.');
      return;
    }
    if (!devolucionForm.producto_id) {
      setErrorMsg('Debes seleccionar un producto o sabor para devolver.');
      return;
    }
    if (!numCantidad || numCantidad <= 0) {
      setErrorMsg('Ingresa una cantidad mayor a 0 para devolver.');
      return;
    }
    if (stockActualOrigen <= 0) {
      setErrorMsg('No hay stock disponible de este producto en la sucursal para devolver.');
      return;
    }
    if (numCantidad > stockActualOrigen) {
      setErrorMsg(`La cantidad a devolver (${numCantidad}) supera el stock disponible en la sucursal (${stockActualOrigen}).`);
      return;
    }

    try {
      await handleRegistrarDevolucionFabrica({
        sucursal_origen_id: targetOrigenId,
        producto_id: parseInt(devolucionForm.producto_id, 10),
        cantidad: numCantidad,
        motivo: devolucionForm.motivo || 'rotacion_sabor',
        observaciones: devolucionForm.observaciones || '',
        es_evento: Boolean(devolucionForm.es_evento)
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la devolución a fábrica.');
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
        border: '1px solid rgba(52, 152, 219, 0.3)'
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
            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <span>↩️</span> Devolver Helado / Producto a Fábrica
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
              Origen: <strong>{origenBranch?.nombre || 'Mi Sucursal'}</strong> ➡️ Destino: <strong>Fábrica (Depósito)</strong>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowDevolucionModal(false)}
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
          {/* Selector de Sucursal de Origen (Solo para admin si desea cambiar) */}
          {user?.rol === 'admin' && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sucursal que devuelve</label>
              <select
                className="form-control"
                value={devolucionForm.sucursal_origen_id || targetOrigenId}
                onChange={e => setDevolucionForm({ ...devolucionForm, sucursal_origen_id: e.target.value })}
              >
                {sucursales.filter(s => s.id !== 1).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Sabor / Producto */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sabor / Producto a devolver</label>
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
              value={devolucionForm.producto_id || ''}
              onChange={e => setDevolucionForm({ ...devolucionForm, producto_id: e.target.value })}
              required
            >
              <option value="">-- Seleccionar Sabor / Producto --</option>
              {categories.map(cat => {
                const catProds = availableProducts.filter(p => p.categoria === cat.id);
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

          {/* Previsualización de Impacto en Stock */}
          {selectedProd && (
            <div style={{
              background: 'rgba(52, 152, 219, 0.08)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              border: '1px solid rgba(52, 152, 219, 0.2)',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Stock actual en sucursal:</span>
                <strong>{formatQuantity(stockActualOrigen, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Stock actual en Fábrica:</span>
                <span>{formatQuantity(stockActualFabrica, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</span>
              </div>
              {numCantidad > 0 && (
                <div style={{
                  borderTop: '1px solid rgba(52, 152, 219, 0.2)',
                  paddingTop: '0.4rem',
                  marginTop: '0.4rem',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: isExceeded ? 'var(--danger)' : 'var(--text-dark)' }}>
                    <span>Sucursal quedará con:</span>
                    <strong>{formatQuantity(nuevoStockOrigen, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#27ae60', fontWeight: 600 }}>
                    <span>Fábrica recibirá y quedará con:</span>
                    <span>{formatQuantity(nuevoStockFabrica, { ...selectedProd, unidad_medida: isWeight ? 'peso' : selectedProd.unidad_medida })}</span>
                  </div>
                </div>
              )}
              {isExceeded && (
                <p style={{ margin: '0.4rem 0 0 0', color: 'var(--danger)', fontSize: '0.78rem' }}>
                  ⚠️ La cantidad a devolver supera el stock disponible en la sucursal.
                </p>
              )}
            </div>
          )}

          {/* Cantidad a devolver */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Cantidad a devolver ({isWeight ? 'kg' : 'unidades'})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step={isWeight ? "0.001" : "1"}
                min="0.001"
                max="100000"
                className="form-control"
                placeholder={isWeight ? "Ej. 5.600 (o 5600)" : "Ej. 3"}
                value={devolucionForm.cantidad || ''}
                onChange={e => setDevolucionForm({ ...devolucionForm, cantidad: e.target.value })}
                onBlur={e => {
                  if (isWeight && e.target.value !== '') {
                    setDevolucionForm({ ...devolucionForm, cantidad: normalizeWeight(e.target.value) });
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
                💡 Puedes ingresar gramos (ej: <code>5600</code> = 5.600 kg) o kilos directos con punto/coma.
              </small>
            )}
          </div>

          {/* Motivo de la devolución */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Motivo de la devolución</label>
            <select
              className="form-control"
              value={devolucionForm.motivo || 'rotacion_sabor'}
              onChange={e => setDevolucionForm({ ...devolucionForm, motivo: e.target.value })}
              required
            >
              {MOTIVOS_DEVOLUCION_FABRICA.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Observaciones detalladas */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Observación para Fábrica (obligatorio o recomendado)
            </label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Ej: Se devuelve por rotación de temporada / Poco movimiento en mostrador / Para inspección de consistencia de lote L-202611-889."
              value={devolucionForm.observaciones || ''}
              onChange={e => setDevolucionForm({ ...devolucionForm, observaciones: e.target.value })}
              maxLength={500}
              style={{ fontSize: '0.85rem' }}
            />
            <small style={{ color: 'var(--text-light)', fontSize: '0.72rem', float: 'right', marginTop: '0.15rem' }}>
              {(devolucionForm.observaciones || '').length}/500
            </small>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowDevolucionModal(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isExceeded || !numCantidad || numCantidad <= 0 || stockActualOrigen <= 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {loading ? 'Transfiriendo...' : '↩️ Confirmar Devolución a Fábrica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevolucionFabricaModal;

