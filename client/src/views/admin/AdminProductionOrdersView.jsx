import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';

const AdminProductionOrdersView = () => {
  const { productos, user, productionOrders, showToast, isProductVisibleToRole } = useData();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [fechaRequerida, setFechaRequerida] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([]);
  const [selectedDestino, setSelectedDestino] = useState('heladero');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    if (!selectedProductId || !cantidad || cantidad <= 0) return;
    const prod = productos.find(p => p.id === parseInt(selectedProductId));
    if (!prod) return;
    
    const existing = items.find(i => i.producto_id === prod.id);
    if (existing) {
      setItems(items.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + parseInt(cantidad) } : i));
    } else {
      setItems([...items, { producto_id: prod.id, nombre: prod.nombre, categoria: prod.categoria, cantidad: parseInt(cantidad) }]);
    }
    setCantidad('');
    setSelectedProductId('');
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(i => i.producto_id !== id));
  };

  const handleDestinoChange = (e) => {
    if (items.length > 0) {
      if(!window.confirm('Cambiar el destino limpiará los productos seleccionados. ¿Continuar?')) {
        return;
      }
      setItems([]);
    }
    setSelectedDestino(e.target.value);
    setSelectedProductId('');
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('Agrega al menos un producto a la orden', 'error');
      return;
    }
    if (!fechaRequerida) {
      showToast('Selecciona una fecha requerida', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes_produccion')
        .insert([{
          creado_por_id: user.id,
          fecha_requerida: fechaRequerida,
          notas: notas,
          es_evento: true,
          estado: 'pendiente'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const detalles = items.map(i => ({
        orden_id: orderData.id,
        producto_id: i.producto_id,
        cantidad_solicitada: i.cantidad,
        cantidad_producida: 0
      }));

      const { error: detailsError } = await supabase
        .from('orden_produccion_detalles')
        .insert(detalles);

      if (detailsError) throw detailsError;

      showToast('Orden de producción creada con éxito', 'success');
      setShowNewOrder(false);
      setItems([]);
      setNotas('');
      setFechaRequerida('');
    } catch (error) {
      console.error(error);
      showToast('Error al crear la orden: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    if(!window.confirm('¿Eliminar esta orden de producción?')) return;
    try {
      const { error } = await supabase.from('ordenes_produccion').delete().eq('id', id);
      if (error) throw error;
      showToast('Orden eliminada', 'success');
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Órdenes de Producción a Fábrica (Eventos)</h4>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewOrder(!showNewOrder)}>
          {showNewOrder ? 'Cancelar' : '+ Nueva Orden'}
        </button>
      </div>

      {showNewOrder && (
        <form onSubmit={handleSubmitOrder} className="glass-card" style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h5 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary-color)' }}>Crear Nueva Orden de Producción</h5>
          
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Fecha Requerida</label>
              <input 
                type="date" 
                required
                className="form-control"
                value={fechaRequerida}
                onChange={e => setFechaRequerida(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Destino de Producción</label>
              <select className="form-control" value={selectedDestino} onChange={handleDestinoChange}>
                <option value="heladero">Fábrica de Helados (Heladero)</option>
                <option value="pastelero">Pastelería Clásica (Pastelero)</option>
                <option value="pastelero_helado">Pastelería Helada (Pastelero Helado)</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Notas / Descripción del Evento</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Ej. Evento Municipalidad Sábado"
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
            <div className="form-grid" style={{ gap: '0.8rem', alignItems: 'end', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                <label>Producto a Fabricar</label>
                <select className="form-control" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                  <option value="">Seleccionar producto...</option>
                  {productos
                    .filter(p => p.activo === 1 && isProductVisibleToRole(p, selectedDestino))
                    .map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.categoria.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-control"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="Cant."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <button type="button" className="btn btn-outline" onClick={handleAddItem} style={{ width: '100%', height: '42px' }}>
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="table-container" style={{ marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <table style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Cantidad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.producto_id}>
                      <td>{item.nombre}</td>
                      <td style={{ textTransform: 'capitalize' }}>{item.categoria.replace(/_/g, ' ')}</td>
                      <td><strong>{item.cantidad}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" onClick={() => handleRemoveItem(item.producto_id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }} title="Quitar">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || items.length === 0} style={{ minWidth: '200px' }}>
              {loading ? 'Procesando...' : 'Enviar Orden a Fábrica'}
            </button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Orden</th>
              <th>Fecha Requerida</th>
              <th>Notas</th>
              <th>Estado</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(!productionOrders || productionOrders.length === 0) ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                  No hay órdenes de producción registradas.
                </td>
              </tr>
            ) : (
              productionOrders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{new Date(order.fecha_requerida).toLocaleDateString()}</td>
                  <td>{order.notas || '-'}</td>
                  <td>
                    <span className={`badge ${order.estado === 'completada' ? 'badge-entregado' : order.estado === 'en_proceso' ? 'badge-en_transito' : 'badge-preparado'}`}>
                      {order.estado.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                      {order.orden_produccion_detalles?.map(d => (
                        <li key={d.id}>
                          {d.productos?.nombre}: <strong>{d.cantidad_producida} / {d.cantidad_solicitada}</strong>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm" 
                      style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.6rem' }}
                      onClick={() => handleDeleteOrder(order.id)}
                      title="Eliminar Orden"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductionOrdersView;
