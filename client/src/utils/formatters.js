export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatQuantity = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso') {
    const kg = parseFloat(cantidad);
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
  }
  return `${cantidad} u`;
};

export const formatQuantityShort = (cantidad, p) => {
  if (cantidad === undefined || cantidad === null) return '-';
  if (cantidad === 0) return '0';
  if (!p) return `${cantidad}`;
  if (p.unidad_medida === 'peso') {
    const kg = parseFloat(cantidad);
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
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
  const d = new Date(dateString);
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