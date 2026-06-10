import { useData } from '../../context/DataContext';
import React from 'react';
import UnitCalculatorInput from '../common/UnitCalculatorInput';
const TransitLossModal = () => {
  const {
    setShowLossModal,
    handleReportLoss,
    transitLoss,
    setTransitLoss,
    selectedPedido,
    loading
  } = useData();
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
    padding: '1rem'
  }}>
            <div className="glass-card" style={{
      maxWidth: '420px',
      width: '100%'
    }}>
              <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.2rem'
      }}>
                <h3>Reportar Incidente en Tránsito</h3>
                <button className="btn btn-outline btn-sm" onClick={() => setShowLossModal(false)}>Cerrar</button>
              </div>

              <form onSubmit={handleReportLoss}>
                <div className="form-group">
                  <label>Sabor dañado/perdido</label>
                  <select className="form-control" value={transitLoss.producto_id} onChange={e => setTransitLoss({
            ...transitLoss,
            producto_id: e.target.value
          })} required>
                    <option value="">-- Seleccionar --</option>
                    {selectedPedido?.items.map(it => <option key={it.producto_id} value={it.producto_id}>{it.producto_nombre}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad rota/perdida</label>
                  <UnitCalculatorInput value={transitLoss.cantidad_perdida} onChange={e => setTransitLoss({
            ...transitLoss,
            cantidad_perdida: e.target.value
          })} required />
                </div>

                <div className="form-group">
                  <label>Motivo</label>
                  <input type="text" className="form-control" placeholder="Ej. Caída de balde en frenada, pérdida de frío" value={transitLoss.motivo} onChange={e => setTransitLoss({
            ...transitLoss,
            motivo: e.target.value
          })} required />
                </div>

                <button type="submit" className="btn btn-danger" style={{
          width: '100%'
        }} disabled={loading}>
                  Guardar Reporte de Daños
                </button>
              </form>
            </div>
          </div>;
};
export default TransitLossModal;