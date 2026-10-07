import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';

const AdminAuditView = () => {
  const { sucursales, productos, showToast } = useData();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM
  const [selectedSucursal, setSelectedSucursal] = useState(''); // Sucursal ID

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch more logs if they want to filter by month later
      const { data, error } = await supabase
        .from('historial_movimientos')
        .select(`
          *,
          sucursales ( nombre ),
          productos ( nombre )
        `)
        .order('fecha', { ascending: false })
        .limit(1000);

      const { data: usersData } = await supabase.from('usuarios').select('id, nombre');
      const usersMap = {};
      if (usersData) {
        usersData.forEach(u => usersMap[u.id] = u.nombre);
      }

      if (error) {
        if (error.code === '42P01') { // table does not exist
          showToast('La tabla de historial no existe aún. Ejecuta el script SQL en Supabase.', 'error');
        } else {
          throw error;
        }
      } else {
        const logsWithUser = (data || []).map(log => ({
          ...log,
          usuarios: { nombre: usersMap[log.usuario_id] }
        }));
        setLogs(logsWithUser);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTipoMovimiento = (tipo) => {
    const tipos = {
      produccion: 'Producción',
      recepcion: 'Recepción',
      merma_inventario: 'Merma (Faltante)',
      sobrante_inventario: 'Sobrante',
      ajuste_manual: 'Ajuste Manual'
    };
    return tipos[tipo] || tipo;
  };

  const getFilteredLogs = () => {
    let filtered = logs;
    
    if (selectedMonth) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.fecha);
        const logMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        return logMonth === selectedMonth;
      });
    }

    if (selectedSucursal) {
      filtered = filtered.filter(log => log.sucursal_id === parseInt(selectedSucursal));
    }

    return filtered;
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const logsToExport = getFilteredLogs();
      const sucursalName = selectedSucursal ? sucursales.find(s => s.id === parseInt(selectedSucursal))?.nombre : 'Todas las sucursales';
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8" /></head>
        <body>
          <table>
            <tr><td colspan="9" style="font-weight: bold; font-size: 16px; background-color: #059669; color: white;">Auditoría de Movimientos - ${sucursalName} ${selectedMonth ? `(${selectedMonth})` : ''}</td></tr>
            <tr>
              <th style="background-color: #e2e8f0;">Fecha y Hora</th>
              <th style="background-color: #e2e8f0;">Ubicación</th>
              <th style="background-color: #e2e8f0;">Usuario</th>
              <th style="background-color: #e2e8f0;">Tipo</th>
              <th style="background-color: #e2e8f0;">Producto</th>
              <th style="background-color: #e2e8f0;">Stock Anterior</th>
              <th style="background-color: #e2e8f0;">Cant. Movida</th>
              <th style="background-color: #e2e8f0;">Stock Actual</th>
              <th style="background-color: #e2e8f0;">Detalle</th>
            </tr>
      `;

      logsToExport.forEach(log => {
        const stockAnterior = log.stock_resultante !== null ? (log.stock_resultante - log.cantidad) : '-';
        htmlContent += `
          <tr>
            <td>${new Date(log.fecha).toLocaleString()}</td>
            <td>${log.sucursales?.nombre || 'N/D'}</td>
            <td>${log.usuarios?.nombre || 'Sistema'}</td>
            <td>${formatTipoMovimiento(log.tipo_movimiento)}</td>
            <td><strong>${log.productos?.nombre || 'N/D'}</strong></td>
            <td>${stockAnterior}</td>
            <td style="color: ${log.cantidad > 0 ? '#10b981' : '#ef4444'};">${log.cantidad > 0 ? '+' : ''}${log.cantidad}</td>
            <td>${log.stock_resultante !== null ? log.stock_resultante : '-'}</td>
            <td>${log.detalle || '-'}</td>
          </tr>
        `;
      });

      htmlContent += `</table></body></html>`;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria_movimientos_${selectedSucursal ? sucursalName.replace(/\s+/g, '_') + '_' : ''}${selectedMonth || new Date().toISOString().slice(0, 10)}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Auditoría de Movimientos</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Sucursal:</label>
            <select
              className="form-control"
              style={{ padding: '0.25rem 0.5rem' }}
              value={selectedSucursal}
              onChange={e => setSelectedSucursal(e.target.value)}
            >
              <option value="">Todas</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Mes:</label>
            <input 
              type="month" 
              className="form-control" 
              style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
            {(selectedMonth || selectedSucursal) && (
              <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedMonth(''); setSelectedSucursal(''); }}>Limpiar</button>
            )}
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleExportExcel}
            disabled={isExporting || filteredLogs.length === 0}
          >
            {isExporting ? '⏳ Exportando...' : '📊 Exportar a Excel'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>Actualizar</button>
        </div>
      </div>
      <div className="card-body">
        {loading ? (
          <p>Cargando registros...</p>
        ) : filteredLogs.length === 0 ? (
          <p>No hay movimientos registrados {selectedMonth ? 'para este mes' : ''}.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Ubicación</th>
                  <th>Usuario</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Stock Anterior</th>
                  <th style={{ textAlign: 'right' }}>Cant. Movida</th>
                  <th style={{ textAlign: 'right' }}>Stock Actual</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.fecha).toLocaleString()}</td>
                    <td>{log.sucursales?.nombre || 'N/D'}</td>
                    <td>{log.usuarios?.nombre || 'Sistema'}</td>
                    <td><span className="badge badge-info">{formatTipoMovimiento(log.tipo_movimiento)}</span></td>
                    <td><strong>{log.productos?.nombre || 'N/D'}</strong></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-light)' }}>
                      {log.stock_resultante !== null ? (log.stock_resultante - log.cantidad) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: log.cantidad > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {log.cantidad > 0 ? '+' : ''}{log.cantidad}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{log.stock_resultante !== null ? log.stock_resultante : '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{log.detalle || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditView;
