import { useData } from '../../context/DataContext';
import React from 'react';
const AdminMaintenanceView = () => {
  const {
    maintenanceSubTab,
    setMaintenanceSubTab,
    setEditingMaquina,
    setMaquinaForm,
    sucursales,
    setShowMaquinaModal,
    setEditingMaintenance,
    setMaintenanceForm,
    maquinas,
    getLocalDateString,
    getMaintenanceOptionsForMachine,
    setShowMaintenanceModal,
    adminMaquinaSearch,
    setAdminMaquinaSearch,
    selectedSucursalFilter,
    setSelectedSucursalFilter,
    selectedTipoEquipoFilter,
    setSelectedTipoEquipoFilter,
    getEquipoIcon,
    getEquipoTypeLabel,
    handleEditMaquina,
    handleDeleteMaquina,
    getMaintenanceAlerts,
    getMaintenanceTypeLabel,
    adminMantenimientoSearch,
    setAdminMantenimientoSearch,
    selectedMaquinaFilter,
    setSelectedMaquinaFilter,
    mantenimientos,
    getMainMaintenanceTypeLabel,
    handleEditMaintenance,
    handleDeleteMaintenance
  } = useData();
  return <div>
                <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
                  <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
                    <button className={`tab-btn ${maintenanceSubTab === 'inventario' ? 'active' : ''}`} style={{
          border: 'none',
          padding: '0.4rem 1.2rem',
          fontSize: '0.95rem',
          minHeight: 'unset'
        }} onClick={() => setMaintenanceSubTab('inventario')}>
                      📋 Inventario de Equipos
                    </button>
                    <button className={`tab-btn ${maintenanceSubTab === 'mantenimiento' ? 'active' : ''}`} style={{
          border: 'none',
          padding: '0.4rem 1.2rem',
          fontSize: '0.95rem',
          minHeight: 'unset'
        }} onClick={() => setMaintenanceSubTab('mantenimiento')}>
                      🔧 Mantenimientos y Alertas
                    </button>
                  </div>

                  {maintenanceSubTab === 'inventario' ? <button className="btn btn-primary btn-sm" onClick={() => {
        setEditingMaquina(null);
        setMaquinaForm({
          nombre: '',
          tipo_equipo: 'licuadora_horno_batidora_micro',
          sucursal_id: sucursales.length > 0 ? sucursales[0].id : '',
          marca: '',
          modelo: '',
          numero_serie: '',
          fecha_adquisicion: '',
          estado: 'activo',
          descripcion: ''
        });
        setShowMaquinaModal(true);
      }}>
                      ➕ Registrar Equipo
                    </button> : <button className="btn btn-primary btn-sm" onClick={() => {
        setEditingMaintenance(null);
        setMaintenanceForm({
          maquina_id: maquinas.length > 0 ? maquinas[0].id : '',
          fecha: getLocalDateString(),
          tipo: maquinas.length > 0 ? getMaintenanceOptionsForMachine(maquinas[0].id)[0].value : 'revision_tecnica',
          descripcion: '',
          cambio_repuesto: false,
          repuesto_detalle: '',
          costo: '',
          realizado_por: '',
          proxima_fecha: ''
        });
        setShowMaintenanceModal(true);
      }}>
                      ➕ Registrar Mantenimiento
                    </button>}
                </div>

                 {maintenanceSubTab === 'inventario' && <div>
                    {/* Filtros */}
                    <div className="glass-card" style={{
        padding: '1.2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
                      <div style={{
          flex: '1 1 200px'
        }}>
                        <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            display: 'block',
            marginBottom: '4px',
            fontWeight: 600
          }}>Buscar por Nombre / Marca / N/S</span>
                        <input type="text" className="form-control" placeholder="🔍 Buscar equipo..." value={adminMaquinaSearch} onChange={e => setAdminMaquinaSearch(e.target.value)} style={{
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--text)',
            fontSize: '0.95rem',
            height: 'auto',
            minHeight: 'unset'
          }} />
                      </div>

                      <div style={{
          flex: '1 1 200px'
        }}>
                        <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            display: 'block',
            marginBottom: '4px',
            fontWeight: 600
          }}>Filtrar por Sucursal</span>
                        <select className="form-control" value={selectedSucursalFilter} onChange={e => setSelectedSucursalFilter(e.target.value)}>
                          <option value="Todos">Todas las sucursales</option>
                          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                      </div>

                      <div style={{
          flex: '1 1 200px'
        }}>
                        <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            display: 'block',
            marginBottom: '4px',
            fontWeight: 600
          }}>Filtrar por Tipo de Equipo</span>
                        <select className="form-control" value={selectedTipoEquipoFilter} onChange={e => setSelectedTipoEquipoFilter(e.target.value)}>
                          <option value="Todos">Todos los tipos</option>
                          <option value="licuadora_horno_batidora_micro">Licuadoras / Hornos / Batidoras / Microondas</option>
                          <option value="maquina_helado">Máquinas de Helado</option>
                          <option value="frio_abatidor_heladera_camara">Abatidores / Heladeras / Cámaras (Frío)</option>
                          <option value="aire_acondicionado">Aires Acondicionados</option>
                          <option value="otro">Otros Equipos</option>
                        </select>
                      </div>
                    </div>

                    {/* Grilla de Equipos */}
                    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: '1.5rem'
      }}>
                      {maquinas.filter(m => selectedSucursalFilter === 'Todos' || m.sucursal_id === parseInt(selectedSucursalFilter)).filter(m => selectedTipoEquipoFilter === 'Todos' || m.tipo_equipo === selectedTipoEquipoFilter).filter(m => {
          if (!adminMaquinaSearch) return true;
          const q = adminMaquinaSearch.toLowerCase();
          return m.nombre.toLowerCase().includes(q) || m.marca && m.marca.toLowerCase().includes(q) || m.modelo && m.modelo.toLowerCase().includes(q) || m.numero_serie && m.numero_serie.toLowerCase().includes(q) || m.sucursal_nombre && m.sucursal_nombre.toLowerCase().includes(q);
        }).map(m => {
          const icon = getEquipoIcon(m.tipo_equipo);
          const stateColors = {
            activo: {
              bg: 'rgba(16, 185, 129, 0.15)',
              text: 'var(--success)'
            },
            inactiva: {
              bg: 'rgba(107, 114, 128, 0.15)',
              text: 'var(--text-light)'
            },
            inactivo: {
              bg: 'rgba(107, 114, 128, 0.15)',
              text: 'var(--text-light)'
            },
            en_mantenimiento: {
              bg: 'rgba(245, 158, 11, 0.15)',
              text: 'var(--warning)'
            },
            de_baja: {
              bg: 'rgba(239, 68, 68, 0.15)',
              text: 'var(--danger)'
            }
          };
          const stColor = stateColors[m.estado] || {
            bg: 'rgba(0,0,0,0.05)',
            text: 'var(--text-dark)'
          };
          return <div key={m.id} className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem',
            position: 'relative'
          }}>
                              <div>
                                <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.8rem'
              }}>
                                  <div style={{
                  fontSize: '1.8rem'
                }}>{icon}</div>
                                  <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  backgroundColor: stColor.bg,
                  color: stColor.text
                }}>
                                    {m.estado.replace('_', ' ')}
                                  </span>
                                </div>

                                <h4 style={{
                fontSize: '1.25rem',
                marginBottom: '0.4rem',
                fontFamily: 'Outfit',
                color: 'var(--text-dark)'
              }}>{m.nombre}</h4>
                                <div style={{
                display: 'inline-block',
                backgroundColor: 'rgba(24, 144, 255, 0.08)',
                color: 'var(--secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                marginBottom: '0.8rem'
              }}>
                                  📍 {m.sucursal_nombre}
                                </div>

                                <div style={{
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                color: 'var(--text-light)',
                marginBottom: '0.8rem',
                borderTop: '1px solid rgba(0,0,0,0.04)',
                paddingTop: '0.6rem'
              }}>
                                  <span><strong>Tipo:</strong> {getEquipoTypeLabel(m.tipo_equipo)}</span>
                                  {m.marca && <span><strong>Marca:</strong> {m.marca}</span>}
                                  {m.modelo && <span><strong>Modelo:</strong> {m.modelo}</span>}
                                  {m.numero_serie && <span><strong>N/S:</strong> {m.numero_serie}</span>}
                                  {m.fecha_adquisicion && <span><strong>Adquisición:</strong> {new Date(m.fecha_adquisicion).toLocaleDateString()}</span>}
                                </div>

                                {m.descripcion && <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-dark)',
                marginBottom: '1rem',
                fontStyle: 'italic',
                background: 'rgba(0,0,0,0.02)',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px'
              }}>
                                    "{m.descripcion}"
                                  </p>}
                              </div>

                              <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              paddingTop: '0.8rem'
            }}>
                                <button className="btn btn-outline btn-sm" style={{
                flex: 1,
                padding: '0.35rem'
              }} onClick={() => {
                setMaintenanceForm({
                  maquina_id: m.id,
                  fecha: getLocalDateString(),
                  tipo: getMaintenanceOptionsForMachine(m.id)[0].value,
                  descripcion: '',
                  cambio_repuesto: false,
                  repuesto_detalle: '',
                  costo: '',
                  realizado_por: '',
                  proxima_fecha: ''
                });
                setMaintenanceSubTab('mantenimiento');
                setShowMaintenanceModal(true);
              }}>
                                  🔧 Mantener
                                </button>
                                <button className="btn btn-outline btn-sm" style={{
                padding: '0.35rem 0.6rem',
                borderColor: 'rgba(0,0,0,0.1)'
              }} onClick={() => handleEditMaquina(m)} title="Editar Equipo">
                                  ✏️
                                </button>
                                <button className="btn btn-outline btn-sm" style={{
                padding: '0.35rem 0.6rem',
                borderColor: 'var(--danger)',
                color: 'var(--danger)'
              }} onClick={() => handleDeleteMaquina(m.id)} title="Eliminar Equipo">
                                  🗑️
                                </button>
                              </div>
                            </div>;
        })}
                      {maquinas.filter(m => selectedSucursalFilter === 'Todos' || m.sucursal_id === parseInt(selectedSucursalFilter)).filter(m => selectedTipoEquipoFilter === 'Todos' || m.tipo_equipo === selectedTipoEquipoFilter).filter(m => {
          if (!adminMaquinaSearch) return true;
          const q = adminMaquinaSearch.toLowerCase();
          return m.nombre.toLowerCase().includes(q) || m.marca && m.marca.toLowerCase().includes(q) || m.modelo && m.modelo.toLowerCase().includes(q) || m.numero_serie && m.numero_serie.toLowerCase().includes(q) || m.sucursal_nombre && m.sucursal_nombre.toLowerCase().includes(q);
        }).length === 0 && <div className="glass-card" style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          padding: '2rem 1rem',
          color: 'var(--text-light)',
          width: '100%'
        }}>
                            No se encontraron equipos registrados.
                          </div>}
                    </div>
                  </div>}

                {maintenanceSubTab === 'mantenimiento' && <div>
                    {/* Alertas */}
                    <div className="glass-card" style={{
        padding: '1.2rem',
        marginBottom: '1.5rem'
      }}>
                      <h4 className="section-title" style={{
          border: 'none',
          margin: '0 0 1rem 0',
          fontSize: '1.1rem',
          color: 'var(--text-dark)'
        }}>
                        🚨 Control de Mantenimientos Vencidos o Próximos
                      </h4>
                      {(() => {
          const alerts = getMaintenanceAlerts();
          if (alerts.length === 0) {
            return <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
                              <span>✅</span>
                              <span>Todos los equipos se encuentran al día. No hay mantenimientos programados vencidos ni próximos en los siguientes 30 días.</span>
                            </div>;
          }
          return <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
                            {alerts.map(al => <div key={al.id} style={{
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              background: al.estado === 'vencido' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${al.estado === 'vencido' ? 'var(--danger)' : 'var(--warning)'}`,
              color: al.estado === 'vencido' ? 'hsl(354, 70%, 30%)' : 'hsl(38, 92%, 30%)',
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
                                <div>
                                  <strong>{al.estado === 'vencido' ? '🔴 VENCIDO' : '🟡 PRÓXIMO'}</strong>: El equipo{' '}
                                  <strong>{al.maquina?.nombre}</strong> ({al.maquina?.sucursal_nombre}) requiere{' '}
                                  <strong>{getMaintenanceTypeLabel(al.tipo_mantenimiento)}</strong>.{' '}
                                  {al.estado === 'vencido' ? <span>Venció hace {al.dias} días</span> : <span>Vence en {al.dias} días</span>}{' '}
                                  (Fecha límite: {new Date(al.proxima_fecha).toLocaleDateString()}).
                                </div>
                                <button className="btn btn-sm btn-primary" style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                minHeight: 'unset',
                background: al.estado === 'vencido' ? 'var(--danger)' : 'var(--warning)',
                color: 'white',
                border: 'none'
              }} onClick={() => {
                setMaintenanceForm({
                  maquina_id: al.maquina.id,
                  fecha: getLocalDateString(),
                  tipo: al.tipo_mantenimiento,
                  descripcion: '',
                  cambio_repuesto: false,
                  repuesto_detalle: '',
                  costo: '',
                  realizado_por: '',
                  proxima_fecha: ''
                });
                setShowMaintenanceModal(true);
              }}>
                                  Realizar Mantenimiento
                                </button>
                              </div>)}
                          </div>;
        })()}
                    </div>

                    {/* Historial */}
                    <div className="glass-card">
                      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
                        <h4 className="section-title" style={{
            border: 'none',
            margin: 0,
            fontSize: '1.1rem',
            color: 'var(--text-dark)'
          }}>
                          📋 Historial de Trabajos Realizados
                        </h4>

                        <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
                          <div style={{
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
                            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-light)',
                fontWeight: 600
              }}>Buscar:</span>
                            <input type="text" className="form-control search-control-responsive" placeholder="🔍 Buscar trabajo..." value={adminMantenimientoSearch} onChange={e => setAdminMantenimientoSearch(e.target.value)} />
                          </div>

                          <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
                            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-light)',
                fontWeight: 600
              }}>Filtrar por Máquina:</span>
                            <select className="form-control" style={{
                width: '220px',
                maxWidth: '100%',
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                background: 'var(--input-bg)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: 'var(--text-dark)'
              }} value={selectedMaquinaFilter} onChange={e => setSelectedMaquinaFilter(e.target.value)}>
                              <option value="Todos">Todas las máquinas</option>
                              {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.sucursal_nombre})</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Equipo</th>
                              <th>Tipo</th>
                              <th>Descripción / Diagnóstico</th>
                              <th>Costo</th>
                              <th>Realizado Por</th>
                              <th>Próximo Control</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mantenimientos.filter(m => selectedMaquinaFilter === 'Todos' || m.maquina_id === parseInt(selectedMaquinaFilter)).filter(m => {
                if (!adminMantenimientoSearch) return true;
                const q = adminMantenimientoSearch.toLowerCase();
                return m.maquina_nombre && m.maquina_nombre.toLowerCase().includes(q) || m.descripcion && m.descripcion.toLowerCase().includes(q) || m.realizado_por && m.realizado_por.toLowerCase().includes(q) || m.tipo && getMaintenanceTypeLabel(m.tipo).toLowerCase().includes(q);
              }).map(m => <tr key={m.id}>
                                  <td><strong>{new Date(m.fecha).toLocaleDateString()}</strong></td>
                                  <td>
                                    <strong>{m.maquina_nombre}</strong>
                                    {m.maquina_marca && <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-light)'
                  }}>{m.maquina_marca} {m.maquina_modelo}</div>}
                                  </td>
                                  <td style={{
                  fontSize: '0.85rem'
                }}>{getMainMaintenanceTypeLabel(m.tipo)}</td>
                                  <td>
                                    <div style={{
                    fontSize: '0.9rem'
                  }}>{m.descripcion}</div>
                                    {m.cambio_repuesto && <div style={{
                    marginTop: '4px'
                  }}>
                                        <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(24, 144, 255, 0.08)',
                      border: '1px dashed var(--secondary)',
                      borderRadius: '4px',
                      color: 'var(--secondary)',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.4rem',
                      fontWeight: 600
                    }}>
                                          🔧 Repuesto: {m.repuesto_detalle || 'Detalle no provisto'}
                                        </span>
                                      </div>}
                                  </td>
                                  <td style={{
                  fontWeight: 600
                }}>{m.costo > 0 ? `$ ${parseFloat(m.costo).toLocaleString('es-AR', {
                    minimumFractionDigits: 2
                  })}` : '-'}</td>
                                  <td style={{
                  fontSize: '0.85rem'
                }}>{m.realizado_por || '-'}</td>
                                  <td style={{
                  fontSize: '0.85rem'
                }}>
                                    {m.proxima_fecha ? <span style={{
                    color: new Date(m.proxima_fecha) < new Date(getLocalDateString()) ? 'var(--danger)' : 'var(--text-dark)',
                    fontWeight: new Date(m.proxima_fecha) < new Date(getLocalDateString()) ? 700 : 500
                  }}>
                                        {new Date(m.proxima_fecha).toLocaleDateString()}
                                      </span> : '-'}
                                  </td>
                                  <td>
                                    <div style={{
                    display: 'flex',
                    gap: '0.3rem'
                  }}>
                                      <button className="btn btn-outline btn-sm" style={{
                      padding: '0.25rem 0.4rem',
                      fontSize: '0.8rem'
                    }} onClick={() => handleEditMaintenance(m)} title="Editar Registro">
                                        ✏️
                                      </button>
                                      <button className="btn btn-outline btn-sm" style={{
                      padding: '0.25rem 0.4rem',
                      fontSize: '0.8rem',
                      borderColor: 'var(--danger)',
                      color: 'var(--danger)'
                    }} onClick={() => handleDeleteMaintenance(m.id)} title="Eliminar Registro">
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>)}
                            {mantenimientos.filter(m => selectedMaquinaFilter === 'Todos' || m.maquina_id === parseInt(selectedMaquinaFilter)).filter(m => {
                if (!adminMantenimientoSearch) return true;
                const q = adminMantenimientoSearch.toLowerCase();
                return m.maquina_nombre && m.maquina_nombre.toLowerCase().includes(q) || m.descripcion && m.descripcion.toLowerCase().includes(q) || m.realizado_por && m.realizado_por.toLowerCase().includes(q) || m.tipo && getMaintenanceTypeLabel(m.tipo).toLowerCase().includes(q);
              }).length === 0 && <tr>
                                  <td colSpan="8" style={{
                  textAlign: 'center',
                  color: 'var(--text-light)',
                  padding: '2rem'
                }}>
                                    No hay registros de mantenimiento para esta selección.
                                  </td>
                                </tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>}
              </div>;
};
export default AdminMaintenanceView;