import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';

const AdminAuditView = () => {
  const { sucursales, productos, showToast } = useData();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Intentar cargar la tabla si existe. Si no, mostrar error.
      const { data, error } = await supabase
        .from('historial_movimientos')
        .select(`
          *,
          sucursales ( nombre ),
          productos ( nombre )
        `)
        .order('fecha', { ascending: false })
        .limit(200);

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

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Auditoría de Movimientos</h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>Actualizar</button>
      </div>
      <div className="card-body">
        {loading ? (
          <p>Cargando registros...</p>
        ) : logs.length === 0 ? (
          <p>No hay movimientos registrados.</p>
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
                  <th style={{ textAlign: 'right' }}>Cant. Movida</th>
                  <th style={{ textAlign: 'right' }}>Stock Resultante</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.fecha).toLocaleString()}</td>
                    <td>{log.sucursales?.nombre || 'N/D'}</td>
                    <td>{log.usuarios?.nombre || 'Sistema'}</td>
                    <td><span className="badge badge-info">{formatTipoMovimiento(log.tipo_movimiento)}</span></td>
                    <td><strong>{log.productos?.nombre || 'N/D'}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: log.cantidad > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {log.cantidad > 0 ? '+' : ''}{log.cantidad}
                    </td>
                    <td style={{ textAlign: 'right' }}>{log.stock_resultante !== null ? log.stock_resultante : '-'}</td>
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
