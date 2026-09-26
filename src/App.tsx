import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from './services/database';
import {
  Machine,
  MaintenanceRule,
  HoursLog,
  ServiceRecord,
  MaintenanceAlert,
  MachineCategory,
} from './types/machinery';

// Components
import { HorometerDisplay } from './components/HorometerDisplay';
import { LogHoursModal } from './components/LogHoursModal';
import { RecordServiceModal } from './components/RecordServiceModal';
import { MachineModal } from './components/MachineModal';
import { RuleModal } from './components/RuleModal';
import { ExportImportModal } from './components/ExportImportModal';
import { AlertCard } from './components/AlertCard';
import { MachineCard } from './components/MachineCard';
import { ConfirmModal } from './components/ConfirmModal';
import { formatCOP } from './utils/formatCurrency';

// Icons
import {
  Truck,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  FileText,
  Database,
  Search,
  Filter,
  Plus,
  Calendar,
  Layers,
  Fuel,
  DollarSign,
  TrendingUp,
  Download,
  ShieldAlert,
  HelpCircle,
  Calculator,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [dbState, setDbState] = useState(dbService.getState());
  const [activeTab, setActiveTab] = useState<
    'alerts' | 'fleet' | 'rules' | 'logs' | 'serviceHistory' | 'calculator'
  >('alerts');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMachineForRuleTab, setSelectedMachineForRuleTab] = useState<string>('all');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceMachineFilter, setServiceMachineFilter] = useState<string>('all');

  // Modals state
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [preselectedMachineForLog, setPreselectedMachineForLog] = useState<string | undefined>();

  const [isRecordServiceOpen, setIsRecordServiceOpen] = useState(false);
  const [preselectedMachineForService, setPreselectedMachineForService] = useState<string | undefined>();
  const [preselectedRuleForService, setPreselectedRuleForService] = useState<string | undefined>();

  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<Machine | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<MaintenanceRule | null>(null);
  const [ruleModalDefaultMachineId, setRuleModalDefaultMachineId] = useState<string | undefined>();

  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // In-app confirmation dialog (replaces browser confirm() which is blocked in iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Eliminar',
    onConfirm: () => {},
  });

  // Subscribe to database changes
  useEffect(() => {
    const unsubscribe = dbService.subscribe((newState) => {
      setDbState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { machines, maintenanceRules, hoursLogs, serviceRecords } = dbState;

  // Compute alerts dynamically
  const alerts = useMemo(() => dbService.getAlerts(), [dbState]);

  const overdueAlerts = useMemo(
    () => alerts.filter((a) => a.severity === 'vencido'),
    [alerts]
  );
  const dueSoonAlerts = useMemo(
    () => alerts.filter((a) => a.severity === 'proximo'),
    [alerts]
  );

  const totalFleetHours = useMemo(
    () => machines.reduce((acc, m) => acc + m.currentHours, 0),
    [machines]
  );

  // Filtered machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assignedOperator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [machines, searchTerm, categoryFilter, statusFilter]);

  // Filtered alerts
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>('all');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSearch =
        a.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.machineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.taskName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        alertCategoryFilter === 'all' || a.category === alertCategoryFilter;
      const matchSeverity =
        alertSeverityFilter === 'all' || a.severity === alertSeverityFilter;

      return matchSearch && matchCategory && matchSeverity;
    });
  }, [alerts, searchTerm, alertCategoryFilter, alertSeverityFilter]);

  // Rules grouped by machine for the "Configuración de Horas" tab
  const rulesGroupedByMachine = useMemo(() => {
    if (selectedMachineForRuleTab === 'all') {
      return machines.map((m) => ({
        machine: m,
        rules: maintenanceRules.filter((r) => r.machineId === m.id),
      }));
    }
    const machine = machines.find((m) => m.id === selectedMachineForRuleTab);
    if (!machine) return [];
    return [
      {
        machine,
        rules: maintenanceRules.filter((r) => r.machineId === machine.id),
      },
    ];
  }, [machines, maintenanceRules, selectedMachineForRuleTab]);

  // Filtered service records for the "Historial de Servicios" tab
  const filteredServiceRecords = useMemo(() => {
    return serviceRecords.filter((rec) => {
      const m = machines.find((x) => x.id === rec.machineId);
      const search = serviceSearchTerm.toLowerCase();
      const matchesSearch =
        rec.taskName.toLowerCase().includes(search) ||
        rec.technicianName.toLowerCase().includes(search) ||
        rec.partsReplaced.toLowerCase().includes(search) ||
        (rec.notes || '').toLowerCase().includes(search) ||
        (rec.workOrderNumber || '').toLowerCase().includes(search) ||
        (m?.code || '').toLowerCase().includes(search) ||
        (m?.name || '').toLowerCase().includes(search);

      const matchesMachine =
        serviceMachineFilter === 'all' || rec.machineId === serviceMachineFilter;

      return matchesSearch && matchesMachine;
    });
  }, [serviceRecords, machines, serviceSearchTerm, serviceMachineFilter]);

  // Handler helpers
  const handleOpenLogHours = (machineId?: string) => {
    setPreselectedMachineForLog(machineId);
    setIsLogHoursOpen(true);
  };

  const handleOpenRecordService = (machineId?: string, ruleId?: string) => {
    setPreselectedMachineForService(machineId);
    setPreselectedRuleForService(ruleId);
    setIsRecordServiceOpen(true);
  };

  const handleOpenNewMachine = () => {
    setMachineToEdit(null);
    setIsMachineModalOpen(true);
  };

  const handleOpenEditMachine = (machine: Machine) => {
    setMachineToEdit(machine);
    setIsMachineModalOpen(true);
  };

  const handleOpenNewRule = (machineId?: string) => {
    setRuleToEdit(null);
    setRuleModalDefaultMachineId(machineId || (machines.length > 0 ? machines[0].id : undefined));
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (ruleId: string) => {
    const rule = maintenanceRules.find((r) => r.id === ruleId);
    if (rule) {
      setRuleToEdit(rule);
      setRuleModalDefaultMachineId(rule.machineId);
      setIsRuleModalOpen(true);
    }
  };

  const handleDeleteMachine = (id: string) => {
    const m = machines.find((x) => x.id === id);
    setConfirmDialog({
      isOpen: true,
      title: `¿Eliminar máquina ${m?.code || ''}?`,
      message: `¿Está seguro de eliminar "${m?.name || 'esta máquina'}"? Se borrarán permanentemente sus reglas de mantenimiento, bitácoras de turnos y servicios asociados.`,
      confirmText: 'Sí, eliminar máquina',
      onConfirm: async () => {
        await dbService.deleteMachine(id);
      },
    });
  };

  const handleDeleteRule = (id: string) => {
    const r = maintenanceRules.find((x) => x.id === id);
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar pauta de mantenimiento?',
      message: `¿Está seguro de eliminar la regla "${r?.taskName || ''}"? Ya no se generarán alarmas para este intervalo.`,
      confirmText: 'Eliminar regla',
      onConfirm: async () => {
        await dbService.deleteMaintenanceRule(id);
      },
    });
  };

  // CSV Export for logs
  const handleExportLogsCsv = () => {
    const headers = [
      'Fecha',
      'Código Máquina',
      'Nombre Máquina',
      'Horas Sumadas',
      'Horómetro Anterior',
      'Horómetro Nuevo',
      'Operador',
      'Turno',
      'Combustible (Lts)',
      'Descripción de Trabajo',
    ];
    const rows = hoursLogs.map((log) => {
      const m = machines.find((x) => x.id === log.machineId);
      return [
        log.date,
        m?.code || '',
        `"${m?.name || ''}"`,
        log.hoursAdded,
        log.previousHours,
        log.newTotalHours,
        `"${log.operatorName}"`,
        log.shift,
        log.fuelAddedLiters || 0,
        `"${log.workDescription || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_horometros_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* ================= TOP NAVBAR ================= */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20 font-black">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-wider text-white">HOROMAX</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded">
                    Flota Pesada
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium hidden md:block">
                  Control de Horómetros y Alarmas de Mantenimiento (Aceites y Filtros)
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenLogHours()}
                className="py-2 px-3 sm:px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Clock className="w-4 h-4" />
                <span>+ Registrar Horas</span>
              </button>

              <button
                onClick={() => handleOpenRecordService()}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 hidden sm:flex"
              >
                <Wrench className="w-4 h-4" />
                <span>Mantenimiento</span>
              </button>

              <button
                onClick={() => setIsExportImportOpen(true)}
                title="Base de datos y respaldos"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition border border-zinc-700 flex items-center gap-1.5"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold hidden md:inline">Base de Datos</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CRITICAL OVERDUE ALARM BANNER ================= */}
      {overdueAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-900 via-red-950 to-zinc-950 border-b border-red-700/80 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 text-red-200">
              <div className="p-2 bg-red-600 text-white rounded-full animate-bounce">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-white font-bold block sm:inline">
                  ¡ALERTA CRÍTICA DE MANTENIMIENTO!
                </strong>{' '}
                <span>
                  Hay {overdueAlerts.length} componente(s) con intervalo de horas superado en tu flota.
                  (Ejemplo: {overdueAlerts[0].machineCode} - {overdueAlerts[0].taskName}).
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('alerts');
                  setAlertSeverityFilter('vencido');
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shadow-md"
              >
                Ver Alarmas Vencidas ({overdueAlerts.length})
              </button>
              <button
                onClick={() => handleOpenRecordService(overdueAlerts[0].machineId, overdueAlerts[0].ruleId)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-red-600 text-red-200 font-bold rounded-lg text-xs transition"
              >
                Registrar Cambio Inmediato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Fleet */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Maquinaria en Flota
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {machines.length}{' '}
                <span className="text-xs font-normal text-zinc-400">equipos</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                {machines.filter((m) => m.status === 'Operativa').length} en servicio
              </span>
            </div>
            <div className="p-3 bg-zinc-800 rounded-xl text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Overdue Alarms */}
          <div
            onClick={() => {
              setActiveTab('alerts');
              setAlertSeverityFilter('vencido');
            }}
            className={`cursor-pointer border p-4 rounded-xl flex items-center justify-between transition ${
              overdueAlerts.length > 0
                ? 'bg-red-950/40 border-red-700/80 shadow-md shadow-red-950/40 hover:bg-red-950/60'
                : 'bg-zinc-900/90 border-zinc-800'
            }`}
          >
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Alarmas Vencidas
              </span>
              <span
                className={`text-2xl font-black mt-1 block ${
                  overdueAlerts.length > 0 ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                {overdueAlerts.length}{' '}
                <span className="text-xs font-normal text-zinc-400">servicios</span>
              </span>
              <span className="text-[11px] text-zinc-400">
                {overdueAlerts.length > 0 ? '¡Requiere cambio urgente!' : 'Sin retrasos críticos'}
              </span>
            </div>
            <div
              className={`p-3 rounded-xl ${
                overdueAlerts.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Due Soon Alarms */}
          <div
            onClick={() => {
              setActiveTab('alerts');
              setAlertSeverityFilter('proximo');
            }}
            className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-amber-500/50 transition"
          >
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Próximos a Vencer
              </span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {dueSoonAlerts.length}{' '}
                <span className="text-xs font-normal text-zinc-400">en aviso</span>
              </span>
              <span className="text-[11px] text-zinc-400">Programar repuestos</span>
            </div>
            <div className="p-3 bg-zinc-800 rounded-xl text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Total Fleet Horometer */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Horas Totales Flota
              </span>
              <span className="text-2xl font-black text-zinc-100 font-mono mt-1 block">
                {totalFleetHours.toLocaleString('es-CO', { minimumFractionDigits: 1 })}{' '}
                <span className="text-xs font-normal text-zinc-400">hrs</span>
              </span>
              <span className="text-[11px] text-blue-400 font-medium">
                {hoursLogs.length} turnos registrados
              </span>
            </div>
            <div className="p-3 bg-zinc-800 rounded-xl text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ================= TAB NAVIGATION ================= */}
        <div className="border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'alerts'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Centro de Alarmas</span>
              {overdueAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black">
                  {overdueAlerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'fleet'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Flota de Maquinaria ({machines.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'rules'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Configuración de Intervalos (Horas)</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'logs'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Bitácora de Horómetros ({hoursLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('serviceHistory')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'serviceHistory'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Historial de Servicios ({serviceRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-2.5 px-3.5 rounded-t-lg font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'calculator'
                  ? 'border-amber-500 text-amber-400 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Proyector Preventivo</span>
            </button>
          </div>

          {/* Quick Buttons on Tab Bar */}
          <div className="flex items-center gap-2 pb-2">
            {activeTab === 'fleet' && (
              <button
                onClick={handleOpenNewMachine}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nueva Máquina
              </button>
            )}

            {activeTab === 'rules' && (
              <button
                onClick={() => handleOpenNewRule()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Definir Nueva Regla de Horas
              </button>
            )}

            {activeTab === 'logs' && (
              <button
                onClick={handleExportLogsCsv}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-700"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* ================= TAB 1: ALARM CENTER ================= */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Filter and explanation bar */}
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar máquina o servicio (ej. Aceite, Filtro, CAT)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 w-full sm:w-64 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400 font-semibold">Estado:</span>
                  <select
                    value={alertSeverityFilter}
                    onChange={(e) => setAlertSeverityFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="all">Todas ({alerts.length})</option>
                    <option value="vencido">Vencidas ({overdueAlerts.length})</option>
                    <option value="proximo">Próximas ({dueSoonAlerts.length})</option>
                    <option value="normal">En Orden</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400 font-semibold">Componente:</span>
                  <select
                    value={alertCategoryFilter}
                    onChange={(e) => setAlertCategoryFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="all">Todos los Componentes</option>
                    <option value="Aceite de Motor">Aceite de Motor</option>
                    <option value="Filtro de Aceite">Filtro de Aceite</option>
                    <option value="Filtro de Combustible">Filtro de Combustible</option>
                    <option value="Filtro de Aire">Filtro de Aire</option>
                    <option value="Sistema Hidráulico">Sistema Hidráulico</option>
                    <option value="Engrase y Articulaciones">Engrase</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Alarm Cards Grid */}
            {filteredAlerts.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">No hay alarmas que coincidan</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Todas las pautas de cambio de aceite, filtros y lubricantes están al día o no coinciden con los filtros aplicados.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setAlertSeverityFilter('all');
                    setAlertCategoryFilter('all');
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg text-xs font-semibold"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onRecordService={handleOpenRecordService}
                    onLogHours={handleOpenLogHours}
                    onEditRule={handleOpenEditRule}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: FLEET OF MACHINES ================= */}
        {activeTab === 'fleet' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, modelo, operador, ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 w-full sm:w-72 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400 font-semibold">Tipo:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="all">Todas las Categorías</option>
                    <option value="Excavadora">Excavadora</option>
                    <option value="Bulldozer / Tractor">Bulldozer / Tractor</option>
                    <option value="Retroexcavadora">Retroexcavadora</option>
                    <option value="Cargador Frontal">Cargador Frontal</option>
                    <option value="Motoniveladora">Motoniveladora</option>
                    <option value="Volqueta / Camión">Volqueta / Camión</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400 font-semibold">Estado:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="Operativa">Operativa</option>
                    <option value="Alerta Crítica">Alerta Crítica</option>
                    <option value="En Mantenimiento">En Mantenimiento</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenNewMachine}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Máquina
                </button>
              </div>
            </div>

            {/* Machines Grid */}
            {filteredMachines.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center space-y-3">
                <Truck className="w-12 h-12 text-zinc-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">No se encontraron máquinas</h3>
                <p className="text-xs text-zinc-400">
                  Prueba cambiando los términos de búsqueda o registra una nueva máquina en la flota.
                </p>
                <button
                  onClick={handleOpenNewMachine}
                  className="px-4 py-2 bg-amber-500 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  Registrar Primera Máquina
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMachines.map((machine) => {
                  const machineRules = maintenanceRules.filter((r) => r.machineId === machine.id);
                  return (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      rules={machineRules}
                      onLogHours={handleOpenLogHours}
                      onConfigureRules={(id) => {
                        setSelectedMachineForRuleTab(id);
                        setActiveTab('rules');
                      }}
                      onEditMachine={handleOpenEditMachine}
                      onDeleteMachine={handleDeleteMachine}
                      onRecordService={handleOpenRecordService}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MAINTENANCE RULES CONFIGURATION ================= */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {/* Header info & Filter */}
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Definición de Intervalos de Mantenimiento por Máquina
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Establece a cuántas horas de trabajo se activará la alarma para cada máquina (ej. Aceite cada 250h, Filtro combustible cada 500h).
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedMachineForRuleTab}
                  onChange={(e) => setSelectedMachineForRuleTab(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-semibold focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Ver Todas las Máquinas</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    handleOpenNewRule(
                      selectedMachineForRuleTab !== 'all' ? selectedMachineForRuleTab : undefined
                    )
                  }
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Pauta
                </button>
              </div>
            </div>

            {/* List grouped by machine */}
            <div className="space-y-6">
              {rulesGroupedByMachine.map(({ machine, rules }) => (
                <div
                  key={machine.id}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  {/* Machine Header */}
                  <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-xs">
                        {machine.code}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{machine.name}</h4>
                        <span className="text-[11px] text-zinc-400">
                          {machine.category} • {machine.brand} {machine.model} • Operador: {machine.assignedOperator}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                          Horómetro Actual
                        </span>
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {machine.currentHours.toFixed(1)} hrs
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenNewRule(machine.id)}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar Pauta
                      </button>
                    </div>
                  </div>

                  {/* Rules Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2.5">Tarea / Componente</th>
                          <th className="px-4 py-2.5">Categoría</th>
                          <th className="px-4 py-2.5 text-center">Intervalo (Cada X Horas)</th>
                          <th className="px-4 py-2.5 text-center">Último Servicio</th>
                          <th className="px-4 py-2.5 text-center">Próximo Vencimiento</th>
                          <th className="px-4 py-2.5">Estado / Horas Restantes</th>
                          <th className="px-4 py-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {rules.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                              Esta máquina no tiene reglas de mantenimiento configuradas.{' '}
                              <button
                                onClick={() => handleOpenNewRule(machine.id)}
                                className="text-amber-400 underline font-semibold"
                              >
                                Configurar primera regla
                              </button>
                            </td>
                          </tr>
                        ) : (
                          rules.map((rule) => {
                            const hoursRemaining = rule.nextDueHours - machine.currentHours;
                            const isOverdue = hoursRemaining <= 0;
                            const isDueSoon = !isOverdue && hoursRemaining <= rule.leadTimeHours;

                            return (
                              <tr key={rule.id} className="hover:bg-zinc-850/50 transition">
                                <td className="px-4 py-3 font-semibold text-white">
                                  <div className="flex items-center gap-2">
                                    <span>{rule.taskName}</span>
                                    {rule.criticality === 'Crítica' && (
                                      <span className="px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/40 rounded text-[9px] font-bold">
                                        Crítica
                                      </span>
                                    )}
                                  </div>
                                  {rule.recommendedParts && (
                                    <div className="text-[10px] text-zinc-400 font-normal">
                                      {rule.recommendedParts}
                                    </div>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-zinc-300">{rule.category}</td>

                                <td className="px-4 py-3 text-center font-mono font-bold text-amber-400">
                                  cada {rule.intervalHours} h
                                </td>

                                <td className="px-4 py-3 text-center font-mono text-zinc-300">
                                  {rule.lastServiceHours} h
                                </td>

                                <td className="px-4 py-3 text-center font-mono font-bold text-zinc-200">
                                  {rule.nextDueHours} h
                                </td>

                                <td className="px-4 py-3">
                                  {isOverdue ? (
                                    <span className="px-2 py-0.5 rounded-full bg-red-600/80 text-white font-bold text-[10px] animate-pulse">
                                      ¡Vencido hace {Math.abs(hoursRemaining).toFixed(1)} h!
                                    </span>
                                  ) : isDueSoon ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold text-[10px]">
                                      Faltan {hoursRemaining.toFixed(1)} h (Próximo)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-medium text-[10px]">
                                      En orden (Faltan {hoursRemaining.toFixed(1)} h)
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenRecordService(machine.id, rule.id)}
                                      title="Registrar servicio hecho"
                                      className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700 text-emerald-300 rounded"
                                    >
                                      <Wrench className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditRule(rule.id)}
                                      title="Editar intervalo en horas"
                                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded"
                                    >
                                      <Sliders className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRule(rule.id)}
                                      title="Eliminar regla"
                                      className="p-1.5 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: HOURS LOGS (BITÁCORA DE HORÓMETROS) ================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Bitácora de Horas de Servicio Registradas
                </h3>
                <p className="text-xs text-zinc-400">
                  Registro detallado de turnos, jornadas trabajadas y horómetros acumulados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenLogHours()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  + Registrar Nuevo Turno
                </button>
                <button
                  onClick={handleExportLogsCsv}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Máquina</th>
                      <th className="px-4 py-3 text-center">Horas Sumadas (+h)</th>
                      <th className="px-4 py-3 text-center">Horómetro Anterior</th>
                      <th className="px-4 py-3 text-center">Horómetro Resultante</th>
                      <th className="px-4 py-3">Operador / Turno</th>
                      <th className="px-4 py-3">Combustible</th>
                      <th className="px-4 py-3">Descripción de Trabajo</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {hoursLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                          Aún no se han registrado turnos u horas de servicio.{' '}
                          <button
                            onClick={() => handleOpenLogHours()}
                            className="text-amber-400 underline font-semibold"
                          >
                            Registrar el primero ahora
                          </button>
                        </td>
                      </tr>
                    ) : (
                      hoursLogs.map((log) => {
                        const m = machines.find((x) => x.id === log.machineId);
                        return (
                          <tr key={log.id} className="hover:bg-zinc-850/50 transition">
                            <td className="px-4 py-3 font-medium text-zinc-300 whitespace-nowrap">
                              {log.date}
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-amber-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px] mr-1.5">
                                {m?.code || 'MAQ'}
                              </span>
                              <span className="font-medium text-white">{m?.name || 'Desconocida'}</span>
                            </td>

                            <td className="px-4 py-3 text-center font-mono font-black text-amber-400">
                              +{log.hoursAdded.toFixed(1)} h
                            </td>

                            <td className="px-4 py-3 text-center font-mono text-zinc-400">
                              {log.previousHours.toFixed(1)} h
                            </td>

                            <td className="px-4 py-3 text-center font-mono font-bold text-zinc-100">
                              {log.newTotalHours.toFixed(1)} h
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              <div>{log.operatorName}</div>
                              <span className="text-[10px] text-zinc-400">{log.shift}</span>
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {log.fuelAddedLiters ? `${log.fuelAddedLiters} Lts` : '-'}
                            </td>

                            <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                              {log.workDescription}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: '¿Eliminar registro de horas?',
                                    message: `Se borrará el turno de ${log.hoursAdded} horas del ${log.date} para la máquina ${m?.code || ''}.`,
                                    confirmText: 'Eliminar turno',
                                    onConfirm: async () => {
                                      await dbService.deleteHoursLog(log.id);
                                    },
                                  });
                                }}
                                title="Eliminar registro"
                                className="p-1 hover:text-red-400 text-zinc-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SERVICE HISTORY ================= */}
        {activeTab === 'serviceHistory' && (
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-400" />
                  Historial de Mantenimientos Realizados
                </h3>
                <p className="text-xs text-zinc-400">
                  Órdenes de servicio completadas, repuestos instalados, observaciones técnicas y costos en COP
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar por repuesto, observación, técnico..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 w-full sm:w-60 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={serviceMachineFilter}
                  onChange={(e) => setServiceMachineFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  <option value="all">Todas las Máquinas</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleOpenRecordService()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Servicio
                </button>
              </div>
            </div>

            {/* Service Records Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Máquina</th>
                      <th className="px-4 py-3">Mantenimiento Ejecutado</th>
                      <th className="px-4 py-3 text-center">Horómetro al Servicio</th>
                      <th className="px-4 py-3">Mecánico / Taller</th>
                      <th className="px-4 py-3">Repuestos / Lubricantes</th>
                      <th className="px-4 py-3 text-right">Costo ($ COP)</th>
                      <th className="px-4 py-3 text-center">Próxima Cita</th>
                      <th className="px-4 py-3">Observaciones Realizadas</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredServiceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-zinc-400">
                          {serviceRecords.length === 0 ? (
                            <>
                              Aún no hay servicios registrados en el historial.{' '}
                              <button
                                onClick={() => handleOpenRecordService()}
                                className="text-emerald-400 underline font-semibold"
                              >
                                Registrar mantenimiento
                              </button>
                            </>
                          ) : (
                            <>
                              No hay registros que coincidan con la búsqueda.{' '}
                              <button
                                onClick={() => {
                                  setServiceSearchTerm('');
                                  setServiceMachineFilter('all');
                                }}
                                className="text-emerald-400 underline font-semibold"
                              >
                                Limpiar filtros
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredServiceRecords.map((rec) => {
                        const m = machines.find((x) => x.id === rec.machineId);
                        return (
                          <tr key={rec.id} className="hover:bg-zinc-850/50 transition">
                            <td className="px-4 py-3 font-medium text-zinc-300 whitespace-nowrap">
                              {rec.serviceDate}
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-amber-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px] mr-1.5">
                                {m?.code || 'MAQ'}
                              </span>
                              <span className="font-medium text-white">{m?.name || 'Desconocida'}</span>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-semibold text-emerald-400">{rec.taskName}</span>
                              {rec.workOrderNumber && (
                                <span className="text-[10px] text-zinc-400 block">
                                  {rec.workOrderNumber}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center font-mono font-bold text-zinc-100">
                              {rec.hoursAtService} hrs
                            </td>

                            <td className="px-4 py-3 text-zinc-300">{rec.technicianName}</td>

                            <td className="px-4 py-3 text-zinc-300 max-w-xs">
                              {rec.partsReplaced}
                            </td>

                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {formatCOP(rec.cost)}
                            </td>

                            <td className="px-4 py-3 text-center font-mono text-zinc-300 whitespace-nowrap">
                              {rec.nextScheduledHours} hrs
                            </td>

                            {/* Columna de Observaciones Realizadas */}
                            <td className="px-4 py-3 text-zinc-300 min-w-[200px] max-w-sm">
                              {rec.notes ? (
                                <div className="bg-zinc-950/80 border border-zinc-750 p-2 rounded-lg text-xs text-zinc-200 flex items-start gap-1.5 shadow-xs">
                                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{rec.notes}</span>
                                </div>
                              ) : (
                                <span className="text-zinc-500 italic text-[11px]">Sin observaciones</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: '¿Eliminar registro de mantenimiento?',
                                    message: `Se borrará el registro del ${rec.serviceDate} (${rec.taskName}) para la máquina ${m?.code || ''}.`,
                                    confirmText: 'Eliminar servicio',
                                    onConfirm: async () => {
                                      await dbService.deleteServiceRecord(rec.id);
                                    },
                                  });
                                }}
                                title="Eliminar servicio"
                                className="p-1 hover:text-red-400 text-zinc-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: PREVENTIVE CALCULATOR / PLANNER ================= */}
        {activeTab === 'calculator' && (
          <PreventiveCalculator machines={machines} rules={maintenanceRules} />
        )}
      </main>

      {/* ================= MODALS ================= */}
      <LogHoursModal
        isOpen={isLogHoursOpen}
        onClose={() => setIsLogHoursOpen(false)}
        machines={machines}
        maintenanceRules={maintenanceRules}
        preselectedMachineId={preselectedMachineForLog}
      />

      <RecordServiceModal
        isOpen={isRecordServiceOpen}
        onClose={() => setIsRecordServiceOpen(false)}
        machines={machines}
        maintenanceRules={maintenanceRules}
        preselectedMachineId={preselectedMachineForService}
        preselectedRuleId={preselectedRuleForService}
        onSuccess={() => {
          setActiveTab('serviceHistory');
        }}
      />

      <MachineModal
        isOpen={isMachineModalOpen}
        onClose={() => setIsMachineModalOpen(false)}
        machineToEdit={machineToEdit}
      />

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        machines={machines}
        ruleToEdit={ruleToEdit}
        defaultMachineId={ruleModalDefaultMachineId}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
      />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-800/80 py-4 px-4 text-center text-xs text-zinc-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>HOROMAX Machinery DB v1.0 • Base de Datos Conectada</span>
          </div>
          <div>
            Control de mantenimiento preventivo para excavadoras, volquetas, cargadores y maquinaria pesada.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Subcomponent: Preventive Calculator
function PreventiveCalculator({
  machines,
  rules,
}: {
  machines: Machine[];
  rules: MaintenanceRule[];
}) {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    machines.length > 0 ? machines[0].id : ''
  );
  const [dailyHours, setDailyHours] = useState<number>(8);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(6);

  const machine = machines.find((m) => m.id === selectedMachineId);
  const machineRules = rules.filter((r) => r.machineId === selectedMachineId);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            Simulador y Proyector Preventivo de Mantenimiento
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Calcula la fecha exacta estimada en la que saltará la alarma según las horas promedio trabajadas por día.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-semibold focus:ring-1 focus:ring-amber-500"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.code}] {m.name} ({m.currentHours.toFixed(1)} h)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Simulator Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div>
          <label className="text-xs text-zinc-400 block font-semibold mb-1">
            Horas promedio trabajadas por día
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="24"
              value={dailyHours}
              onChange={(e) => setDailyHours(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold font-mono"
            />
            <span className="text-xs text-zinc-300 font-semibold">horas/día</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block font-semibold mb-1">
            Días de operación por semana
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="7"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-bold font-mono"
            />
            <span className="text-xs text-zinc-300 font-semibold">días/semana</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block font-semibold mb-1">
            Ritmo de acumulación
          </label>
          <div className="text-base font-bold text-white mt-1">
            {(dailyHours * daysPerWeek).toFixed(0)} horas / semana
          </div>
        </div>
      </div>

      {/* Projections Table */}
      {machine && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center justify-between">
            <span>
              Proyecciones para: [{machine.code}] {machine.name} (Horómetro actual:{' '}
              {machine.currentHours.toFixed(1)} h)
            </span>
          </h4>

          <div className="overflow-x-auto bg-zinc-950 rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Mantenimiento</th>
                  <th className="px-4 py-3">Intervalo</th>
                  <th className="px-4 py-3 text-center">Horas Restantes</th>
                  <th className="px-4 py-3 text-center">Días de Trabajo Faltantes</th>
                  <th className="px-4 py-3">Fecha Estimada de Alarma</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {machineRules.map((r) => {
                  const hoursLeft = r.nextDueHours - machine.currentHours;
                  const isOverdue = hoursLeft <= 0;

                  let daysLeft = 0;
                  let projectedDateStr = 'Inmediato (Vencido)';

                  if (!isOverdue) {
                    daysLeft = Math.ceil(hoursLeft / dailyHours);
                    const now = new Date();
                    // Add calendar days accounting for working days
                    const calendarDays = Math.ceil(daysLeft * (7 / daysPerWeek));
                    const projected = new Date(now.getTime() + calendarDays * 24 * 60 * 60 * 1000);
                    projectedDateStr = projected.toLocaleDateString('es-CO', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                  }

                  return (
                    <tr key={r.id} className="hover:bg-zinc-850/50">
                      <td className="px-4 py-3 font-semibold text-white">{r.taskName}</td>
                      <td className="px-4 py-3 text-zinc-300">Cada {r.intervalHours} h</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {isOverdue ? (
                          <span className="text-red-400">
                            -{Math.abs(hoursLeft).toFixed(1)} h
                          </span>
                        ) : (
                          <span className="text-zinc-200">{hoursLeft.toFixed(1)} h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-400">
                        {isOverdue ? '0 días' : `~${daysLeft} días`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-100">{projectedDateStr}</td>
                      <td className="px-4 py-3">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded font-bold text-[10px]">
                            VENCIDO
                          </span>
                        ) : daysLeft <= 3 ? (
                          <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 rounded font-bold text-[10px]">
                            Esta semana
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px]">
                            Programado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper
function Trash2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
