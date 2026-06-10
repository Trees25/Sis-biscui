import React from 'react';

const UnitCalculatorInput = ({ value, onChange, product, placeholder = "Cantidad", disabled = false, min = 0 }) => {
  const isWeight = product?.unidad_medida === 'peso';

  if (isWeight) {
    const displayVal = value !== undefined && value !== null && value !== '' ? parseFloat(value) : '';
    return (
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
        <input
          type="number"
          step="0.001"
          className="form-control"
          style={{ flex: 1 }}
          value={displayVal}
          onChange={e => {
            const val = e.target.value;
            onChange(val === '' ? '' : Math.max(min, parseFloat(val)));
          }}
          placeholder={`${placeholder} (kg)`}
          disabled={disabled}
          min={min}
        />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>kg</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
      <input
        type="number"
        step="1"
        className="form-control"
        style={{ flex: 1 }}
        value={value === undefined || value === null ? '' : value}
        onChange={e => {
          const val = e.target.value;
          onChange(val === '' ? '' : Math.max(min, parseInt(val) || 0));
        }}
        placeholder={`${placeholder} (u)`}
        disabled={disabled}
        min={min}
      />
      <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>u</span>
    </div>
  );
};

export default UnitCalculatorInput;
