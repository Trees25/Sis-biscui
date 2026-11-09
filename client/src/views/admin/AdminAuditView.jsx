import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';
import { formatTipo, formatQuantityShort } from '../../utils/formatters';
import { sanitizeSpreadsheetCell, escapeHtml } from '../../utils/validators';

const AdminAuditView = () => {
  const { sucursales, productos, categories, showToast } = useData();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const usersMapRef = useRef(null);

  // Filters
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [periodMode, setPeriodMode] = useState('dia'); // 'dia', 'semana', 'mes', 'anio', 'rango', 'todos'
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to 2026-09-30 if current date or fallback
    return '2026-09-30';
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    return '2026-09-30';
  });
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [rangeStart, setRangeStart] = useState('2026-09-30');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('todos'); // 'todos' by default so loads of Sept 30 show immediately
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [
        supabase
          .from('historial_movimientos')
          .select(`
            *,
            sucursales ( nombre ),
            productos ( nombre, tipo, categoria, unidad_medida )
          `)
          .order('fecha', { ascending: false })
          .limit(1000),
        supabase
          .from('lotes_produccion')
          .select(`
            *,
            productos ( nombre, tipo, categoria, unidad_medida )
          `)
          .order('fecha_produccion', { ascending: false })
          .limit(1000)
      ];

      if (!usersMapRef.current) {
        promises.push(supabase.from('usuarios').select('id, nombre, auth_id'));
      }

      const results = await Promise.all(promises);
      const { data: histData, error: histError } = results[0];
      const { data: lotesData, error: lotesError } = results[1];

      if (histError && histError.code !== '42P01') {
        throw histError;
      }
      if (lotesError) {
        throw lotesError;
      }

      if (results[2]?.data) {
        const map = {};
        results[2].data.forEach(u => {
          map[u.id] = u.nombre;
          if (u.auth_id) map[u.auth_id] = u.nombre;
        });
        usersMapRef.current = map;
      }
      const usersMap = usersMapRef.current || {};

      // Format historial_movimientos
      const mappedHist = (histData || []).map(item => ({
        id: `hist-${item.id}`,
        fecha: item.fecha,
        sucursal_id: item.sucursal_id,
        sucursal_nombre: item.sucursales?.nombre || 'Sucursal',
        producto_id: item.producto_id,
        productos: item.productos,
        usuario_nombre: usersMap[item.usuario_id] || (item.usuario_id ? 'Usuario' : 'Sistema'),
        tipo_movimiento: item.tipo_movimiento,
        origen_dato: 'auditoria',
        cantidad: item.cantidad,
        stock_resultante: item.stock_resultante,
        detalle: item.detalle || 'Ajuste de inventario'
      }));

      // Format lotes_produccion as production / initial stock loads
      const mappedLotes = (lotesData || []).map(lote => ({
        id: `lote-${lote.id}`,
        fecha: lote.fecha_produccion || lote.created_at,
        sucursal_id: 1, // Factory / Central production
        sucursal_nombre: 'Fábrica (Depósito)',
        producto_id: lote.producto_id,
        productos: lote.productos,
        usuario_nombre: usersMap[lote.creado_por] || 'Heladero / Fábrica',
        tipo_movimiento: 'produccion',
        origen_dato: 'lotes',
        cantidad: lote.cantidad,
        stock_resultante: lote.cantidad,
        detalle: `Carga de Stock / Lote: ${lote.codigo_lote}`
      }));

      // Combine both sources and sort descending by date
      const combined = [...mappedHist, ...mappedLotes].sort((a, b) => {
        return new Date(b.fecha) - new Date(a.fecha);
      });

      setLogs(combined);
    } catch (err) {
      showToast('Error al cargar datos de auditoría: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLogs();

    let debounceTimer = null;
    const debouncedFetchLogs = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchLogs();
      }, 800);
    };

    const channelHist = supabase
      .channel('realtime-hist-audit')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_movimientos' }, () => {
        debouncedFetchLogs();
      })
      .subscribe();

    const channelLotes = supabase
      .channel('realtime-lotes-audit')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes_produccion' }, () => {
        debouncedFetchLogs();
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channelHist);
      supabase.removeChannel(channelLotes);
    };
  }, [fetchLogs]);

  const formatTipoMovimiento = (tipo) => {
    const tipos = {
      produccion: 'Carga de Stock / Producción',
      carga_inicial: 'Carga de Stock Inicial',
      recepcion: 'Recepción de Pedido',
      envio_sucursal: 'Envío a Sucursal',
      consumo_diario: 'Consumo Diario',
      merma_inventario: 'Merma (Faltante)',
      sobrante_inventario: 'Sobrante',
      ajuste_inventario: 'Control Inventario',
      ajuste_manual: 'Ajuste Manual'
    };
    return tipos[tipo] || tipo;
  };

  const getTipoBadgeClass = (tipo) => {
    if (tipo === 'produccion' || tipo === 'carga_inicial') return 'badge badge-primary';
    if (tipo === 'recepcion' || tipo === 'sobrante_inventario') return 'badge badge-success';
    if (tipo === 'merma_inventario' || tipo === 'consumo_diario') return 'badge badge-danger';
    if (tipo === 'envio_sucursal') return 'badge badge-warning';
    if (tipo === 'ajuste_inventario') return 'badge badge-info';
    if (tipo === 'ajuste_manual') return 'badge badge-warning';
    return 'badge badge-secondary';
  };

  // Helper to calculate start & end of week for a given date
  const getWeekRange = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10)
    };
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.fecha) return false;
      const logDate = new Date(log.fecha);
      if (isNaN(logDate)) return false;
      // Fecha LOCAL (no UTC) para que cargas después de las 21hs no caigan en el día siguiente
      const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;

      // Sucursal filter
      if (selectedSucursal && log.sucursal_id !== parseInt(selectedSucursal)) {
        return false;
      }

      // Movement Type filter
      if (selectedMovementType === 'inventario') {
        if (!['sobrante_inventario', 'merma_inventario', 'ajuste_inventario'].includes(log.tipo_movimiento)) {
          return false;
        }
      } else if (selectedMovementType === 'produccion') {
        if (!['produccion', 'carga_inicial'].includes(log.tipo_movimiento)) {
          return false;
        }
      } else if (selectedMovementType && selectedMovementType !== 'todos') {
        if (log.tipo_movimiento !== selectedMovementType) {
          return false;
        }
      }

      // Category filter
      const prodCategory = log.productos?.categoria;
      if (selectedCategory && prodCategory !== selectedCategory) {
        return false;
      }

      // Search term
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pName = (log.productos?.nombre || '').toLowerCase();
        const detail = (log.detalle || '').toLowerCase();
        const uName = (log.usuario_nombre || '').toLowerCase();
        if (!pName.includes(q) && !detail.includes(q) && !uName.includes(q)) {
          return false;
        }
      }

      // Period filters
      if (periodMode === 'dia') {
        if (selectedDate && logDateStr !== selectedDate) {
          return false;
        }
      } else if (periodMode === 'semana') {
        if (selectedWeek) {
          const { start, end } = getWeekRange(selectedWeek);
          if (logDateStr < start || logDateStr > end) {
            return false;
          }
        }
      } else if (periodMode === 'mes') {
        if (selectedMonth) {
          const logMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
          if (logMonth !== selectedMonth) {
            return false;
          }
        }
      } else if (periodMode === 'anio') {
        if (selectedYear) {
          if (String(logDate.getFullYear()) !== selectedYear) {
            return false;
          }
        }
      } else if (periodMode === 'rango') {
        if (rangeStart && logDateStr < rangeStart) return false;
        if (rangeEnd && logDateStr > rangeEnd) return false;
      }

      return true;
    });
  }, [
    logs,
    selectedSucursal,
    selectedMovementType,
    selectedCategory,
    searchQuery,
    periodMode,
    selectedDate,
    selectedWeek,
    selectedMonth,
    selectedYear,
    rangeStart,
    rangeEnd
  ]);

  // Summary stats for filtered view
  const summary = useMemo(() => {
    let totalStockCargadoKg = 0;
    let totalStockCargadoU = 0;
    let totalDiffKg = 0;
    let totalDiffU = 0;

    filteredLogs.forEach(log => {
      const isWeight = log.productos?.unidad_medida === 'peso' || log.productos?.categoria === 'helados';
      const resultant = parseFloat(log.stock_resultante) || 0;
      const diff = parseFloat(log.cantidad) || 0;

      if (isWeight) {
        totalStockCargadoKg += resultant;
        totalDiffKg += diff;
      } else {
        totalStockCargadoU += resultant;
        totalDiffU += diff;
      }
    });

    return {
      count: filteredLogs.length,
      totalStockCargadoKg: Number(totalStockCargadoKg.toFixed(3)),
      totalStockCargadoU: Math.round(totalStockCargadoU),
      totalDiffKg: Number(totalDiffKg.toFixed(3)),
      totalDiffU: Math.round(totalDiffU)
    };
  }, [filteredLogs]);

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const sucursalName = selectedSucursal
        ? sucursales.find(s => s.id === parseInt(selectedSucursal))?.nombre || 'Sucursal'
        : 'Todas las Sucursales';

      let periodDesc = 'Histórico Completo';
      if (periodMode === 'dia') periodDesc = `Día: ${selectedDate}`;
      else if (periodMode === 'semana') {
        const { start, end } = getWeekRange(selectedWeek);
        periodDesc = `Semana del ${start} al ${end}`;
      } else if (periodMode === 'mes') periodDesc = `Mes: ${selectedMonth}`;
      else if (periodMode === 'anio') periodDesc = `Año: ${selectedYear}`;
      else if (periodMode === 'rango') periodDesc = `Rango: ${rangeStart || 'Inicio'} a ${rangeEnd || 'Fin'}`;

      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            th { background-color: #059669; color: white; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1; }
            td { padding: 5px 8px; border: 1px solid #e2e8f0; }
            .header-info { background-color: #f8fafc; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <td colspan="11" style="font-size: 18px; font-weight: bold; background-color: #059669; color: white; text-align: center; padding: 10px;">
                Reporte de Carga de Stock e Inventario - ${sucursalName}
              </td>
            </tr>
            <tr class="header-info">
              <td colspan="3"><strong>Período:</strong> ${periodDesc}</td>
              <td colspan="3"><strong>Categoría:</strong> ${selectedCategory ? selectedCategory.toUpperCase() : 'TODAS'}</td>
              <td colspan="5"><strong>Generado el:</strong> ${new Date().toLocaleString()}</td>
            </tr>
            <tr class="header-info">
              <td colspan="3"><strong>Total Registros:</strong> ${summary.count}</td>
              <td colspan="4"><strong>Total Stock Cargado/Contado (Helados/Peso):</strong> ${summary.totalStockCargadoKg} kg</td>
              <td colspan="4"><strong>Total Stock Cargado/Contado (Unidades):</strong> ${summary.totalStockCargadoU} u</td>
            </tr>
            <tr><td colspan="11"></td></tr>
            <tr>
              <th>Fecha y Hora</th>
              <th>Sucursal</th>
              <th>Producto / Sabor</th>
              <th>Formato / Envase</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th>Stock Anterior (Sistema)</th>
              <th>Cantidad / Ajuste</th>
              <th>Stock Real Contado / Cargado</th>
              <th>Tipo de Tarea</th>
              <th>Usuario Responsable</th>
              <th>Detalle / Lote</th>
            </tr>
      `;

      filteredLogs.forEach(log => {
        const isWeight = log.productos?.unidad_medida === 'peso' || log.productos?.categoria === 'helados';
        const unit = isWeight ? 'kg' : 'unidades';
        const stockAnterior = log.tipo_movimiento === 'produccion'
          ? '-'
          : log.stock_resultante !== null && log.stock_resultante !== undefined
            ? (log.stock_resultante - log.cantidad)
            : '-';
        const stockActual = log.stock_resultante !== null && log.stock_resultante !== undefined
          ? (isWeight ? Number(log.stock_resultante).toFixed(3) : log.stock_resultante)
          : '-';
        const diffQty = log.cantidad !== null && log.cantidad !== undefined
          ? (isWeight ? Number(log.cantidad).toFixed(3) : log.cantidad)
          : '-';

        htmlContent += `
          <tr>
            <td>${escapeHtml(new Date(log.fecha).toLocaleString())}</td>
            <td>${sanitizeSpreadsheetCell(log.sucursal_nombre || 'N/D')}</td>
            <td><strong>${sanitizeSpreadsheetCell(log.productos?.nombre || 'N/D')}</strong></td>
            <td>${sanitizeSpreadsheetCell(formatTipo(log.productos?.tipo) || '-')}</td>
            <td style="text-transform: capitalize;">${sanitizeSpreadsheetCell(log.productos?.categoria || '-')}</td>
            <td>${escapeHtml(unit)}</td>
            <td style="text-align: right;">${escapeHtml(stockAnterior)}</td>
            <td style="text-align: right; color: ${log.cantidad > 0 ? '#10b981' : log.cantidad < 0 ? '#ef4444' : '#000'}; font-weight: bold;">
              ${log.cantidad > 0 ? '+' : ''}${escapeHtml(diffQty)}
            </td>
            <td style="text-align: right; font-weight: bold; background-color: #ecfdf5;">${escapeHtml(stockActual)}</td>
            <td>${sanitizeSpreadsheetCell(formatTipoMovimiento(log.tipo_movimiento))}</td>
            <td>${sanitizeSpreadsheetCell(log.usuario_nombre || 'Sistema')}</td>
            <td>${sanitizeSpreadsheetCell(log.detalle || '-')}</td>
          </tr>
        `;
      });

      htmlContent += `</table></body></html>`;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const safeSuc = (selectedSucursal ? sucursalName : 'todas').replace(/\s+/g, '_');
      const safePer = periodDesc.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute("download", `Carga_Stock_Inventario_${safeSuc}_${safePer}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportación descargada correctamente.', 'success');
    } catch (err) {
      showToast('Error al exportar: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedSucursal('');
    setPeriodMode('dia');
    setSelectedDate('2026-09-30');
    setSelectedWeek('2026-09-30');
    setSelectedMonth('2026-09');
    setSelectedYear('2026');
    setRangeStart('2026-09-30');
    setRangeEnd('');
    setSelectedCategory('');
    setSelectedMovementType('todos');
    setSearchQuery('');
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Auditoría y Control de Stock por Sucursal</h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Consulta y exporta exactamente cuánto se cargó o contó de cada producto/helado en cada inventario o producción.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportExcel}
            disabled={isExporting || filteredLogs.length === 0}
            title="Exportar a archivo Excel con el detalle exacto cargado"
          >
            {isExporting ? '⏳ Generando Excel...' : '📊 Exportar a Excel (.xls)'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Panel de Filtros */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '1.2rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Fila 1: Filtro de Período (Días, Semanas, Meses, Años) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dark)', minWidth: '100px' }}>
              📅 Período:
            </span>
            <div className="btn-group" style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'dia' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('dia')}
              >
                Día
              </button>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'semana' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('semana')}
              >
                Semana
              </button>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'mes' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('mes')}
              >
                Mes
              </button>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'anio' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('anio')}
              >
                Año
              </button>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'rango' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('rango')}
              >
                Rango
              </button>
              <button
                type="button"
                className={`btn btn-sm ${periodMode === 'todos' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 0, padding: '0.3rem 0.8rem' }}
                onClick={() => setPeriodMode('todos')}
              >
                Histórico
              </button>
            </div>

            {/* Selector dinámico según modo */}
            {periodMode === 'dia' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Día exacto:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {periodMode === 'semana' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Fecha en la semana:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(e.target.value)}
                />
                {selectedWeek && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                    ({getWeekRange(selectedWeek).start} al {getWeekRange(selectedWeek).end})
                  </span>
                )}
              </div>
            )}

            {periodMode === 'mes' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Mes:</span>
                <input
                  type="month"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {periodMode === 'anio' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Año:</span>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            )}

            {periodMode === 'rango' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Desde:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Hasta:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.3rem 0.6rem' }}
                  value={rangeEnd}
                  onChange={e => setRangeEnd(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Fila 2: Sucursal, Categoría, Tipo de Movimiento y Búsqueda */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 180px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Sucursal:</span>
              <select
                className="form-control"
                value={selectedSucursal}
                onChange={e => setSelectedSucursal(e.target.value)}
              >
                <option value="">Todas las Sucursales</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 180px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Categoría:</span>
              <select
                className="form-control"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 240px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Tipo Tarea:</span>
              <select
                className="form-control"
                value={selectedMovementType}
                onChange={e => setSelectedMovementType(e.target.value)}
              >
                <option value="todos">Todos los registros (Cargas y Controles)</option>
                <option value="produccion">🏭 Cargas Iniciales y Producción</option>
                <option value="carga_inicial">📦 Carga de Stock Inicial</option>
                <option value="recepcion">📥 Recepción de Pedidos</option>
                <option value="envio_sucursal">📤 Envíos de Fábrica</option>
                <option value="inventario">📋 Controles Semanales de Inventario</option>
                <option value="consumo_diario">☕ Consumos Diarios</option>
                <option value="ajuste_manual">✏️ Ajustes Manuales Admin</option>
                <option value="merma_inventario">📉 Mermas (Faltantes)</option>
                <option value="sobrante_inventario">📈 Sobrantes</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 200px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar sabor/producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={handleClearFilters}
              title="Restablecer filtros"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Barra de Resumen de la Tarea / Período */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.2rem'
        }}>
          <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block' }}>Productos Encontrados</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--text-dark)' }}>{summary.count}</strong>
          </div>
          <div style={{ background: '#ecfdf5', padding: '0.9rem', borderRadius: '8px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#047857', display: 'block' }}>Stock Real Cargado (Helados / Peso)</span>
            <strong style={{ fontSize: '1.3rem', color: '#065f46' }}>{summary.totalStockCargadoKg} kg</strong>
          </div>
          <div style={{ background: '#eff6ff', padding: '0.9rem', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#1d4ed8', display: 'block' }}>Stock Real Cargado (Unidades)</span>
            <strong style={{ fontSize: '1.3rem', color: '#1e40af' }}>{summary.totalStockCargadoU} u</strong>
          </div>
          <div style={{
            background: summary.totalDiffKg >= 0 ? '#f0fdf4' : '#fef2f2',
            padding: '0.9rem',
            borderRadius: '8px',
            border: `1px solid ${summary.totalDiffKg >= 0 ? '#bbf7d0' : '#fecaca'}`,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: summary.totalDiffKg >= 0 ? '#15803d' : '#b91c1c', display: 'block' }}>
              Diferencia / Ajuste Total (Helados)
            </span>
            <strong style={{ fontSize: '1.3rem', color: summary.totalDiffKg >= 0 ? '#166534' : '#991b1b' }}>
              {summary.totalDiffKg > 0 ? '+' : ''}{summary.totalDiffKg} kg
            </strong>
          </div>
        </div>

        {/* Tabla de Movimientos / Cargas de Inventario */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>Cargando registros...</p>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fafafa', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-light)' }}>
              No se encontraron registros de inventario o carga con los filtros seleccionados.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
              Probá seleccionando "Todos los registros" en Tipo Tarea o ampliando el rango de fechas.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Sucursal / Ubicación</th>
                  <th>Producto / Sabor</th>
                  <th>Formato</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Stock Anterior</th>
                  <th style={{ textAlign: 'right' }}>Cantidad / Ajuste</th>
                  <th style={{ textAlign: 'right', backgroundColor: '#ecfdf5', color: '#047857' }}>
                    Stock Cargado / Contado
                  </th>
                  <th>Tipo Tarea</th>
                  <th>Responsable</th>
                  <th>Detalle / Lote</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const isWeight = log.productos?.unidad_medida === 'peso' || log.productos?.categoria === 'helados';
                  const unit = isWeight ? 'kg' : 'u';
                  const stockAnterior = log.tipo_movimiento === 'produccion'
                    ? '-'
                    : log.stock_resultante !== null && log.stock_resultante !== undefined
                      ? (log.stock_resultante - log.cantidad)
                      : null;

                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(log.fecha).toLocaleString()}</td>
                      <td><strong>{log.sucursal_nombre || 'Fábrica'}</strong></td>
                      <td>
                        <strong>{log.productos?.nombre || 'N/D'}</strong>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        {formatTipo(log.productos?.tipo) || '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {log.productos?.categoria || '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {stockAnterior !== null && stockAnterior !== '-' ? formatQuantityShort(stockAnterior, log.productos) : '-'}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color: log.cantidad > 0 ? 'var(--success)' : log.cantidad < 0 ? 'var(--danger)' : 'var(--text-dark)'
                      }}>
                        {log.cantidad > 0 ? '+' : ''}{isWeight ? parseFloat(log.cantidad).toFixed(3) : log.cantidad} {unit}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        backgroundColor: '#f0fdf4',
                        color: '#065f46'
                      }}>
                        {log.stock_resultante !== null
                          ? `${isWeight ? parseFloat(log.stock_resultante).toFixed(3) : log.stock_resultante} ${unit}`
                          : '-'}
                      </td>
                      <td>
                        <span className={getTipoBadgeClass(log.tipo_movimiento)}>
                          {formatTipoMovimiento(log.tipo_movimiento)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.usuario_nombre}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{log.detalle || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditView;
