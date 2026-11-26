import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatTipo, formatQuantity, formatDate } from '../../utils/formatters';
import { MOTIVOS_BAJA_STOCK, MOTIVOS_DEVOLUCION_FABRICA } from '../../utils/validators';

const BajasYDevolucionesHistory = ({ defaultSucursalId = null, filterType = 'all' }) => {
  const {
    bajasList = [],
    devolucionesList = [],
    productos = [],
    sucursales = [],
    fetchBajasYDevoluciones,
    loading
  } = useData();

  const [typeFilter, setTypeFilter] = useState(filterType); // 'all', 'bajas', 'devoluciones'
  const [branchFilter, setBranchFilter] = useState(defaultSucursalId ? String(defaultSucursalId) : 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const motivosMap = useMemo(() => {
    const map = {};
    MOTIVOS_BAJA_STOCK.forEach(m => { map[m.id] = m.label; });
    MOTIVOS_DEVOLUCION_FABRICA.forEach(m => { map[m.id] = m.label; });
    return map;
  }, []);

  const combinedRecords = useMemo(() => {
    const records = [];

    // Bajas de stock
    bajasList.forEach(item => {
      const prod = productos.find(p => p.id === item.producto_id);
      const suc = sucursales.find(s => s.id === item.sucursal_id);
      records.push({
        id: `baja-${item.id}`,
        tipo: 'baja',
        tipoLabel: '🗑️ Baja / Descarte',
        badgeClass: 'badge-inactivo',
        fecha: item.created_at,
        sucursal_id: item.sucursal_id,
        sucursal_nombre: suc?.nombre || `Sucursal #${item.sucursal_id}`,
        producto_id: item.producto_id,
        producto_nombre: prod?.nombre || `Producto #${item.producto_id}`,
        producto_tipo: prod?.tipo,
        producto_categoria: prod?.categoria,
        producto_obj: prod,
        cantidad: item.cantidad,
        motivo: item.motivo,
        motivoLabel: motivosMap[item.motivo] || item.motivo,
        observaciones: item.observaciones,
        usuario_nombre: item.usuario_nombre || 'Usuario'
      });
    });

    // Devoluciones a fábrica
    devolucionesList.forEach(item => {
      const prod = productos.find(p => p.id === item.producto_id);
      const sucOrigen = sucursales.find(s => s.id === item.sucursal_origen_id);
      records.push({
        id: `dev-${item.id}`,
        tipo: 'devolucion',
        tipoLabel: '↩️ Devolución a Fábrica',
        badgeClass: 'badge-activo',
        fecha: item.created_at,
        sucursal_id: item.sucursal_origen_id,
        sucursal_nombre: sucOrigen?.nombre || `Sucursal #${item.sucursal_origen_id}`,
        producto_id: item.producto_id,
        producto_nombre: prod?.nombre || `Producto #${item.producto_id}`,
        producto_tipo: prod?.tipo,
        producto_categoria: prod?.categoria,
        producto_obj: prod,
        cantidad: item.cantidad,
        motivo: item.motivo,
        motivoLabel: motivosMap[item.motivo] || item.motivo,
        observaciones: item.observaciones,
        usuario_nombre: item.usuario_nombre || 'Usuario'
      });
    });

    // Ordenar de más reciente a más antiguo
    records.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return records;
  }, [bajasList, devolucionesList, productos, sucursales, motivosMap]);

  const filteredRecords = useMemo(() => {
    return combinedRecords.filter(r => {
      if (typeFilter !== 'all' && r.tipo !== typeFilter) return false;
      if (branchFilter !== 'all' && String(r.sucursal_id) !== String(branchFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchProd = r.producto_nombre?.toLowerCase().includes(q);
        const matchObs = r.observaciones?.toLowerCase().includes(q);
        const matchMot = r.motivoLabel?.toLowerCase().includes(q);
        const matchSuc = r.sucursal_nombre?.toLowerCase().includes(q);
        if (!matchProd && !matchObs && !matchMot && !matchSuc) return false;
      }
      return true;
    });
  }, [combinedRecords, typeFilter, branchFilter, searchQuery]);

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Barra de Filtros */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.8rem',
        marginBottom: '1rem',
        background: 'rgba(0,0,0,0.02)',
        padding: '0.8rem',
        borderRadius: '10px',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tipo de movimiento */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.05)',
            padding: '3px',
            borderRadius: '8px'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setTypeFilter('all')}
            >
              Todos ({combinedRecords.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'bajas' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setTypeFilter('bajas')}
            >
              🗑️ Bajas ({bajasList.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'devoluciones' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setTypeFilter('devoluciones')}
            >
              ↩️ Devoluciones ({devolucionesList.length})
            </button>
          </div>

          {/* Filtro por Sucursal (si no está bloqueado por prop) */}
          {!defaultSucursalId && (
            <select
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', minWidth: '170px' }}
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
            >
              <option value="all">📍 Todas las Sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={String(s.id)}>{s.nombre}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Buscar por sabor, motivo u observación..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', minWidth: '240px' }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fetchBajasYDevoluciones && fetchBajasYDevoluciones()}
            disabled={loading}
            title="Actualizar registros"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Tipo</th>
              <th>Sucursal</th>
              <th>Sabor / Producto</th>
              <th>Formato</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Observación / Detalle</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(item => {
              return (
                <tr key={item.id}>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {formatDate(item.fecha)}
                  </td>
                  <td>
                    <span className={`badge ${item.badgeClass}`} style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}>
                      {item.tipoLabel}
                    </span>
                  </td>
                  <td><strong>{item.sucursal_nombre}</strong></td>
                  <td><strong>{item.producto_nombre}</strong></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                    {formatTipo(item.producto_tipo) || '-'}
                  </td>
                  <td style={{
                    fontWeight: 700,
                    color: item.tipo === 'baja' ? 'var(--danger)' : 'var(--primary)',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.tipo === 'baja' ? '-' : ''}
                    {formatQuantity(item.cantidad, item.producto_obj)}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {item.motivoLabel}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '300px', lineHeight: 1.35 }}>
                    {item.observaciones ? (
                      <span title={item.observaciones}>{item.observaciones}</span>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Sin observación</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
                    {item.usuario_nombre}
                  </td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2.5rem 1rem' }}>
                  No se encontraron registros de bajas o devoluciones para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BajasYDevolucionesHistory;

