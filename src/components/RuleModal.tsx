import React, { useState, useEffect } from 'react';
import { Machine, MaintenanceCategory, MaintenanceRule } from '../types/machinery';
import { dbService } from '../services/database';
import { formatCOP } from '../utils/formatCurrency';
import {
  X,
  Sliders,
  CheckCircle2,
  Bell,
  Clock,
  Wrench,
  DollarSign,
  AlertTriangle,
  Coins,
} from 'lucide-react';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  ruleToEdit?: MaintenanceRule | null;
  defaultMachineId?: string;
  onSuccess?: () => void;
}

const CATEGORIES: MaintenanceCategory[] = [
  'Aceite de Motor',
  'Filtro de Aceite',
  'Filtro de Combustible',
  'Filtro de Aire',
  'Sistema Hidráulico',
  'Transmisión y Diferenciales',
  'Engrase y Articulaciones',
  'Mandos Finales',
  'Refrigerante y Correas',
  'Frenos y Tren de Rodaje',
  'Inspección General',
];

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  machines,
  ruleToEdit,
  defaultMachineId,
  onSuccess,
}) => {
  const isEditing = !!ruleToEdit;

  const [machineId, setMachineId] = useState<string>(
    defaultMachineId || (machines.length > 0 ? machines[0].id : '')
  );
  const [taskName, setTaskName] = useState('Cambio de Aceite de Motor');
  const [category, setCategory] = useState<MaintenanceCategory>('Aceite de Motor');
  const [intervalHours, setIntervalHours] = useState<number>(250);
  const [lastServiceHours, setLastServiceHours] = useState<number>(0);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(25);
  const [criticality, setCriticality] = useState<'Baja' | 'Media' | 'Alta' | 'Crítica'>('Alta');
  const [recommendedParts, setRecommendedParts] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMachine = machines.find((m) => m.id === machineId);

  useEffect(() => {
    if (ruleToEdit) {
      setMachineId(ruleToEdit.machineId);
      setTaskName(ruleToEdit.taskName);
      setCategory(ruleToEdit.category);
      setIntervalHours(ruleToEdit.intervalHours);
      setLastServiceHours(ruleToEdit.lastServiceHours);
      setLeadTimeHours(ruleToEdit.leadTimeHours);
      setCriticality(ruleToEdit.criticality);
      setRecommendedParts(ruleToEdit.recommendedParts || '');
      setEstimatedCost(ruleToEdit.estimatedCost ? ruleToEdit.estimatedCost.toString() : '');
      setNotes(ruleToEdit.notes || '');
    } else {
      const initialMachineId = defaultMachineId || (machines.length > 0 ? machines[0].id : '');
      setMachineId(initialMachineId);
      const m = machines.find((x) => x.id === initialMachineId);
      setTaskName('Cambio de Aceite de Motor');
      setCategory('Aceite de Motor');
      setIntervalHours(250);
      setLastServiceHours(m ? m.currentHours : 0);
      setLeadTimeHours(25);
      setCriticality('Crítica');
      setRecommendedParts('');
      setEstimatedCost('');
      setNotes('');
    }
  }, [ruleToEdit, defaultMachineId, machines, isOpen]);

  // Quick preset helper when changing category
  const handleCategoryChange = (newCat: MaintenanceCategory) => {
    setCategory(newCat);
    if (!isEditing) {
      if (newCat === 'Aceite de Motor') {
        setTaskName('Cambio de Aceite de Motor 15W-40');
        setIntervalHours(250);
        setLeadTimeHours(25);
        setCriticality('Crítica');
        setEstimatedCost('750000');
      } else if (newCat === 'Filtro de Aceite') {
        setTaskName('Cambio Filtro de Aceite de Motor');
        setIntervalHours(250);
        setLeadTimeHours(25);
        setCriticality('Crítica');
        setEstimatedCost('160000');
      } else if (newCat === 'Filtro de Combustible') {
        setTaskName('Cambio Filtros de Combustible (Primario y Secundario)');
        setIntervalHours(500);
        setLeadTimeHours(35);
        setCriticality('Alta');
        setEstimatedCost('320000');
      } else if (newCat === 'Filtro de Aire') {
        setTaskName('Cambio de Filtro de Aire Primario y Secundario');
        setIntervalHours(500);
        setLeadTimeHours(40);
        setCriticality('Media');
        setEstimatedCost('380000');
      } else if (newCat === 'Engrase y Articulaciones') {
        setTaskName('Engrase General de Pasadores y Articulaciones');
        setIntervalHours(50);
        setLeadTimeHours(10);
        setCriticality('Media');
        setEstimatedCost('90000');
      } else if (newCat === 'Sistema Hidráulico') {
        setTaskName('Cambio de Aceite y Filtros Hidráulicos');
        setIntervalHours(2000);
        setLeadTimeHours(50);
        setCriticality('Alta');
        setEstimatedCost('1600000');
      } else if (newCat === 'Transmisión y Diferenciales') {
        setTaskName('Cambio Aceite Transmisión y Mandos');
        setIntervalHours(1000);
        setLeadTimeHours(50);
        setCriticality('Alta');
        setEstimatedCost('1400000');
      }
    }
  };

  if (!isOpen) return null;

  const nextDue = Number((lastServiceHours + intervalHours).toFixed(1));
  const currentHours = selectedMachine?.currentHours || 0;
  const hoursLeft = Number((nextDue - currentHours).toFixed(1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!machineId || !taskName.trim()) {
      setError('Por favor complete la máquina y el nombre del mantenimiento');
      return;
    }

    if (intervalHours <= 0) {
      setError('El intervalo de horas debe ser mayor a 0');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && ruleToEdit) {
        await dbService.updateMaintenanceRule(ruleToEdit.id, {
          machineId,
          taskName: taskName.trim(),
          category,
          intervalHours: Number(intervalHours),
          lastServiceHours: Number(lastServiceHours),
          nextDueHours: nextDue,
          leadTimeHours: Number(leadTimeHours),
          criticality,
          recommendedParts: recommendedParts.trim(),
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          notes: notes.trim(),
        });
      } else {
        await dbService.addMaintenanceRule({
          machineId,
          taskName: taskName.trim(),
          category,
          intervalHours: Number(intervalHours),
          lastServiceHours: Number(lastServiceHours),
          nextDueHours: nextDue,
          leadTimeHours: Number(leadTimeHours),
          criticality,
          recommendedParts: recommendedParts.trim(),
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          notes: notes.trim(),
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la regla');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-zinc-900 px-6 py-4 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/40 rounded-lg text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isEditing ? 'Editar Intervalo de Mantenimiento' : 'Definir Intervalo de Mantenimiento'}
              </h2>
              <p className="text-xs text-amber-100/80">
                Configura a cuántas horas debe saltar la alarma de cambio de aceite, filtro u otro servicio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Machine & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Máquina a Configurar
              </label>
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.currentHours.toFixed(1)} h)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tipo de Componente / Mantenimiento
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">
              Nombre de la Tarea / Alarma
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Ej. Cambio de Aceite de Motor 15W-40 CI-4"
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Interval Hours & Presets */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Intervalo de Repetición (Cada cuántas horas debe hacerse) *
                </label>
                <p className="text-[11px] text-zinc-400">
                  Frecuencia de servicio recomendada para esta máquina específica.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="10"
                  min="1"
                  max="10000"
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(parseInt(e.target.value) || 250)}
                  required
                  className="w-32 bg-black border-2 border-amber-500 text-amber-400 text-xl font-mono font-bold rounded-lg px-3 py-1.5 text-center focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-sm font-bold text-zinc-300">HORAS</span>
              </div>
            </div>

            {/* Quick Presets for standard heavy machinery */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-400 font-semibold mr-1">Preajustes habituales:</span>
              {[
                { label: '50h (Engrase)', val: 50 },
                { label: '250h (Aceite / Filtro)', val: 250 },
                { label: '300h (Aceite Pesado)', val: 300 },
                { label: '500h (Filtros Comb./Aire)', val: 500 },
                { label: '1000h (Transmisión/Diferencial)', val: 1000 },
                { label: '2000h (Hidráulico)', val: 2000 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setIntervalHours(p.val)}
                  className={`px-2.5 py-1 text-xs rounded border transition ${
                    intervalHours === p.val
                      ? 'bg-amber-600 text-white border-amber-500 font-bold'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Last service & Lead notice & Criticality */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Horómetro de Último Servicio
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={lastServiceHours}
                onChange={(e) => setLastServiceHours(parseFloat(e.target.value) || 0)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-zinc-400">
                Máquina actual: {currentHours.toFixed(1)} h
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Aviso Preventivo (hrs antes)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={leadTimeHours}
                onChange={(e) => setLeadTimeHours(parseInt(e.target.value) || 20)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-zinc-400">Alerta amarilla antes de vencer</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Criticidad de la Alerta</label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Crítica">Crítica (Riesgo Motor)</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Trigger Projection Banner */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400">Próximo Vencimiento Calculado:</span>
              <strong className="text-white ml-1.5 font-mono text-sm">{nextDue} hrs</strong>
            </div>
            <div>
              <span className="text-zinc-400">Estado hoy:</span>
              {hoursLeft <= 0 ? (
                <span className="ml-1.5 px-2 py-0.5 bg-red-600/30 text-red-400 border border-red-500/40 rounded font-bold">
                  ¡Vencido hace {Math.abs(hoursLeft).toFixed(1)} h!
                </span>
              ) : hoursLeft <= leadTimeHours ? (
                <span className="ml-1.5 px-2 py-0.5 bg-amber-600/30 text-amber-400 border border-amber-500/40 rounded font-bold">
                  Próximo (Faltan {hoursLeft.toFixed(1)} h)
                </span>
              ) : (
                <span className="ml-1.5 px-2 py-0.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded font-bold">
                  En Orden ({hoursLeft.toFixed(1)} h restantes)
                </span>
              )}
            </div>
          </div>

          {/* Recommended Parts & Estimated Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-zinc-400">Repuestos o Insumos Recomendados</label>
              <input
                type="text"
                value={recommendedParts}
                onChange={(e) => setRecommendedParts(e.target.value)}
                placeholder="Ej. Filtro 1R-0716 + 24 Litros Aceite 15W-40"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> Costo Estimado ($ COP)
                </label>
                {parseFloat(estimatedCost) > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {formatCOP(parseFloat(estimatedCost))}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="Ej. 750000"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-7 pr-12 py-2 text-sm text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">COP</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing ? 'Guardar Cambios de Intervalo' : 'Crear Regla de Mantenimiento'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
