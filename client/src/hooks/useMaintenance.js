import { useState } from 'react';

export const useMaintenance = () => {
  const [maquinas, setMaquinas] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [maintenanceSubTab, setMaintenanceSubTab] = useState('inventario');
  const [selectedMaquinaFilter, setSelectedMaquinaFilter] = useState('Todos');
  const [selectedSucursalFilter, setSelectedSucursalFilter] = useState('Todos');
  const [selectedTipoEquipoFilter, setSelectedTipoEquipoFilter] = useState('Todos');
  const [showMaquinaModal, setShowMaquinaModal] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [adminMaquinaSearch, setAdminMaquinaSearch] = useState('');
  const [adminMantenimientoSearch, setAdminMantenimientoSearch] = useState('');

  const [maquinaForm, setMaquinaForm] = useState({
    nombre: '',
    tipo_equipo: '',
    sucursal_id: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    fecha_adquisicion: '',
    estado: 'operativa',
    descripcion: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maquina_id: '',
    fecha: '',
    tipo: 'preventivo',
    descripcion: '',
    cambio_repuesto: false,
    repuesto_detalle: '',
    costo: '',
    realizado_por: '',
    proxima_fecha: ''
  });

  return {
    maquinas, setMaquinas,
    mantenimientos, setMantenimientos,
    maintenanceSubTab, setMaintenanceSubTab,
    selectedMaquinaFilter, setSelectedMaquinaFilter,
    selectedSucursalFilter, setSelectedSucursalFilter,
    selectedTipoEquipoFilter, setSelectedTipoEquipoFilter,
    showMaquinaModal, setShowMaquinaModal,
    editingMaquina, setEditingMaquina,
    showMaintenanceModal, setShowMaintenanceModal,
    editingMaintenance, setEditingMaintenance,
    adminMaquinaSearch, setAdminMaquinaSearch,
    adminMantenimientoSearch, setAdminMantenimientoSearch,
    maquinaForm, setMaquinaForm,
    maintenanceForm, setMaintenanceForm
  };
};
