export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTareByTipo = (tipo) => {
  switch (tipo) {
    case 'vasqueta_5_6k':
      return 0.630;
    case 'balde_4k':
      return 0.155;
    case 'balde_8k':
      return 0.270;
    default:
      return 0.0;
  }
};

export const normalizeWeight = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  let num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
  if (isNaN(num)) return 0;
  if (num >= 100) {
    num = num / 1000;
  }
  return Number(num.toFixed(3));
};

export const calculateNetWeight = (rawInput, tipo, discountTare = true) => {
  if (rawInput === undefined || rawInput === null || rawInput === '') {
    return { gross: 0, tare: 0, net: 0, count: 0 };
  }
  const tarePerUnit = discountTare ? getTareByTipo(tipo) : 0;
  const rawStr = String(rawInput).trim();
  const parts = rawStr.split(/[\+\s;]+/).filter(p => p.trim() !== '');

  if (parts.length === 0) {
    return { gross: 0, tare: 0, net: 0, count: 0 };
  }

  let totalGross = 0;
  let totalNet = 0;
  let count = 0;

  for (const part of parts) {
    const num = normalizeWeight(part);
    if (num > 0) {
      count++;
      totalGross += num;
      const unitNet = Math.max(0, num - tarePerUnit);
      totalNet += unitNet;
    }
  }

  return {
    gross: Number(totalGross.toFixed(3)),
    tare: Number((count * tarePerUnit).toFixed(3)),
    net: Number(totalNet.toFixed(3)),
    count
  };
};

export const formatQuantity = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso' || p.categoria === 'helados') {
    const num = typeof cantidad === 'string' ? parseFloat(cantidad.replace(',', '.')) : Number(cantidad);
    const kg = isNaN(num) ? 0 : num;
    return `${kg.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
  }
  return `${cantidad} u`;
};

export const formatQuantityShort = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso' || p.categoria === 'helados') {
    const num = typeof cantidad === 'string' ? parseFloat(cantidad.replace(',', '.')) : Number(cantidad);
    const kg = isNaN(num) ? 0 : num;
    return `${kg.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
  }
  return `${cantidad} u`;
};

export const formatTipo = (tipo) => {
  if (tipo === 'vasqueta_5_6k') return 'Vasqueta';
  if (tipo === 'balde_4k') return 'Balde 5L';
  if (tipo === 'balde_8k') return 'Balde 10L';
  return tipo?.replace(/_/g, ' ');
};

export const getBadgeClass = (state) => {
  return `badge badge-${state}`;
};

export const translateState = (state) => {
  const trans = {
    solicitado: 'Solicitado',
    preparado: 'Preparado',
    en_transito: 'En viaje',
    entregado: 'Entregado OK',
    cancelado: 'Cancelado'
  };
  return trans[state] || state;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  let ds = dateString;
  // If the date string doesn't specify a timezone, assume it's UTC from the database
  if (!ds.includes('Z') && !ds.match(/[\+\-]\d{2}:\d{2}$/)) {
    if (!ds.includes('T')) {
      ds = ds.replace(' ', 'T');
    }
    ds += 'Z';
  }
  const d = new Date(ds);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

export const getCategoryEmoji = (id) => {
  if (id === 'helados') return '🍧';
  if (id === 'pasteleria_helada') return '🍦';
  if (id === 'pasteleria') return '🍰';
  if (id === 'sembrados') return '🌾';
  if (id === 'termicos') return '📦';
  if (id === 'sin_tacc') return '🌱';
  if (id === 'otros') return '✨';
  return '🏷️';
};