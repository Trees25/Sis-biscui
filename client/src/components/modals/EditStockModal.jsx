import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity, normalizeWeight, getTareByTipo, calculateNetWeight } from '../../utils/formatters';

const EditStockModal = () => {
  const {
    setShowEditStockModal,
    handleSaveStockAdmin,
    editStockItemDetails = {},
    editStockForm = {},
    loading,
    productos = [],
    stockData = []
  } = useData();

  const prod = (productos || []).find(p => p.id === editStockForm?.producto_id);
  const isWeight = prod?.unidad_medida === 'peso' || prod?.categoria === 'helados';
  const tareVal = prod ? getTareByTipo(prod?.tipo) : 0;

  const stockActual = editStockItemDetails?.stock_actual !== undefined
    ? Number(editStockItemDetails.stock_actual)
    : (stockData?.find(s => s.producto_id === editStockForm?.producto_id && s.sucursal_id === editStockForm?.sucursal_id && s.es_evento === editStockForm?.es_evento)?.cantidad || 0);

  const [mode, setMode] = useState('sumar'); // 'sumar' or 'fijar'
  const [inputValue, setInputValue] = useState('');
  const [discountTare, setDiscountTare] = useState(tareVal > 0);

  const calc = isWeight
    ? calculateNetWeight(inputValue, prod?.tipo, discountTare)
    : { gross: Number(inputValue || 0), tare: 0, net: Number(inputValue || 0) };

  const hasInput = inputValue !== '' && !isNaN(Number(inputValue.toString().replace(',', '.'))) && calc.gross > 0;

  const resultStock = mode === 'sumar'
    ? (isWeight ? Number((stockActual + calc.net).toFixed(3)) : (stockActual + calc.net))
    : calc.net;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue === '' && mode === 'sumar') {
      setShowEditStockModal(false);
      return;
    }
    handleSaveStockAdmin({
      ...editStockForm,
      cantidad: resultStock
    });
  };

  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '1rem',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  }}>
    <div className="glass-card" style={{
      maxWidth: '440px',
      width: '100%',
      background: 'rgba(255, 255, 255, 0.98)',
      color: '#000'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.2rem',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        paddingBottom: '0.8rem'
      }}>
        <h3 style={{
          margin: 0,
          color: 'var(--text-dark)',
          fontFamily: 'Outfit'
        }}>Ajustar Stock</h3>
        <button className="btn btn-outline btn-sm" style={{
          borderColor: 'rgba(0,0,0,0.2)',
          color: 'var(--text-dark)'
        }} onClick={() => setShowEditStockModal(false)}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          marginBottom: '1.2rem',
          fontSize: '0.9rem',
          background: 'rgba(0,0,0,0.03)',
          padding: '0.8rem',
          borderRadius: '8px'
        }}>
          <div><strong>Producto:</strong> {editStockItemDetails.producto_nombre} <span style={{
            color: 'var(--text-light)',
            fontSize: '0.8rem'
          }}>({formatTipo(editStockItemDetails.tipo)})</span></div>
          {tareVal > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
              Envase: {formatTipo(prod?.tipo)} • Tara: {tareVal.toFixed(3)} kg
            </div>
          )}
          <div><strong>Sucursal:</strong> {editStockItemDetails.sucursal_nombre}</div>
          <div><strong>Tipo de Stock:</strong> {editStockForm.es_evento ? 'Eventos' : 'Común'}</div>
          <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.4rem' }}>
            <strong>Stock Actual:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {formatQuantity(stockActual, { ...prod, unidad_medida: isWeight ? 'peso' : prod?.unidad_medida })}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'sumar' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('sumar')}
          >
            ➕ Sumar al Stock
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'fijar' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('fijar')}
          >
            ✏️ Fijar Stock Exacto
          </button>
        </div>

        <div className="form-group">
          <label style={{
            color: 'var(--text-dark)',
            fontWeight: 600,
            display: 'block',
            marginBottom: '0.4rem'
          }}>
            {mode === 'sumar'
              ? `Cantidad a Sumar (${isWeight ? 'peso balanza' : 'unidades'})`
              : `Nuevo Stock Total (${isWeight ? 'kg' : 'unidades'})`}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {mode === 'sumar' && <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.2rem' }}>+</span>}
            <input
              type="number"
              step={isWeight ? "0.001" : "1"}
              className="form-control"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={e => {
                if (isWeight && e.target.value !== '') {
                  const norm = normalizeWeight(e.target.value);
                  setInputValue(norm);
                }
              }}
              placeholder={isWeight ? "Ej. 2 o 5600" : "Ej. 5"}
              required={mode === 'fijar'}
              style={{
                border: '1px solid rgba(0,0,0,0.15)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                flex: 1
              }}
              min="0"
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-light)' }}>
              {isWeight ? 'kg' : 'u'}
            </span>
          </div>
          
          {tareVal > 0 && isWeight && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
              <input
                type="checkbox"
                checked={discountTare}
                onChange={e => setDiscountTare(e.target.checked)}
              />
              Descontar tara del envase ({tareVal.toFixed(3)} kg) automáticamente
            </label>
          )}
        </div>

        {/* Live preview */}
        <div style={{
          marginBottom: '1.2rem',
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(46, 204, 113, 0.12)',
          border: '1px solid rgba(46, 204, 113, 0.3)',
          fontSize: '0.9rem'
        }}>
          {mode === 'sumar' ? (
            <div>
              {tareVal > 0 && discountTare && hasInput && (
                <div style={{ color: 'var(--text-dark)', fontSize: '0.75rem', marginBottom: '4px' }}>
                  Bruto: {calc.gross.toFixed(3)} kg - Tara ({tareVal.toFixed(3)} kg) = <strong>Neto: +{calc.net.toFixed(3)} kg</strong>
                </div>
              )}
              <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                {formatQuantity(stockActual, prod)} + {formatQuantity(calc.net, prod)}
              </div>
              <div style={{ fontWeight: 700, color: '#27ae60', marginTop: '2px' }}>
                ➡️ Resultado Final: {formatQuantity(resultStock, { ...prod, unidad_medida: isWeight ? 'peso' : prod?.unidad_medida })}
              </div>
            </div>
          ) : (
            <div>
              {tareVal > 0 && discountTare && hasInput && (
                <div style={{ color: 'var(--text-dark)', fontSize: '0.75rem', marginBottom: '4px' }}>
                  Bruto: {calc.gross.toFixed(3)} kg - Tara ({tareVal.toFixed(3)} kg) = <strong>Neto: {calc.net.toFixed(3)} kg</strong>
                </div>
              )}
              <div style={{ fontWeight: 700, color: '#27ae60' }}>
                ➡️ Nuevo Stock Fijado: {formatQuantity(resultStock, { ...prod, unidad_medida: isWeight ? 'peso' : prod?.unidad_medida })}
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" style={{
          width: '100%'
        }} disabled={loading}>
          Guardar Stock
        </button>
      </form>
    </div>
  </div>;
};

export default EditStockModal;