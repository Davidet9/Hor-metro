import React, { useState, useEffect } from 'react';
import { Machine, MaintenanceRule } from '../types/machinery';
import { dbService } from '../services/database';
import { HorometerDisplay } from './HorometerDisplay';
import { formatCOP } from '../utils/formatCurrency';
import {
  X,
  Wrench,
  CheckCircle2,
  Calendar,
  DollarSign,
  UserCheck,
  FileCheck,
  RotateCcw,
  Coins,
} from 'lucide-react';

interface RecordServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  maintenanceRules: MaintenanceRule[];
  preselectedMachineId?: string;
  preselectedRuleId?: string;
  onSuccess?: () => void;
}

export const RecordServiceModal: React.FC<RecordServiceModalProps> = ({
  isOpen,
  onClose,
  machines,
  maintenanceRules,
  preselectedMachineId,
  preselectedRuleId,
  onSuccess,
}) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    preselectedMachineId || (machines.length > 0 ? machines[0].id : '')
  );

  const availableRules = maintenanceRules.filter((r) => r.machineId === selectedMachineId);

  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    preselectedRuleId || (availableRules.length > 0 ? availableRules[0].id : '')
  );

  const currentMachine = machines.find((m) => m.id === selectedMachineId);
  const currentRule = availableRules.find((r) => r.id === selectedRuleId);

  const [serviceDate, setServiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hoursAtService, setHoursAtService] = useState<number>(
    currentMachine ? currentMachine.currentHours : 0
  );
  const [technicianName, setTechnicianName] = useState<string>('Taller de Mantenimiento');
  const [partsReplaced, setPartsReplaced] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [workOrderNumber, setWorkOrderNumber] = useState<string>(
    `OT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs when selection or props change
  useEffect(() => {
    if (preselectedMachineId) {
      setSelectedMachineId(preselectedMachineId);
    }
  }, [preselectedMachineId]);

  useEffect(() => {
    if (preselectedRuleId) {
      setSelectedRuleId(preselectedRuleId);
    } else if (availableRules.length > 0 && !availableRules.some((r) => r.id === selectedRuleId)) {
      setSelectedRuleId(availableRules[0].id);
    }
  }, [selectedMachineId, preselectedRuleId, availableRules, selectedRuleId]);

  useEffect(() => {
    if (currentMachine) {
      setHoursAtService(currentMachine.currentHours);
    }
  }, [currentMachine]);

  useEffect(() => {
    if (currentRule) {
      setPartsReplaced(currentRule.recommendedParts || '');
      setCost(currentRule.estimatedCost ? currentRule.estimatedCost.toString() : '');
    }
  }, [currentRule]);

  // Handler when user selects a different machine
  const handleMachineChange = (newMachineId: string) => {
    setSelectedMachineId(newMachineId);
    const m = machines.find((x) => x.id === newMachineId);
    if (m) {
      setHoursAtService(m.currentHours);
    }
    const newRules = maintenanceRules.filter((r) => r.machineId === newMachineId);
    if (newRules.length > 0) {
      setSelectedRuleId(newRules[0].id);
      setPartsReplaced(newRules[0].recommendedParts || '');
      setCost(newRules[0].estimatedCost ? newRules[0].estimatedCost.toString() : '');
    } else {
      setSelectedRuleId('');
      setPartsReplaced('');
      setCost('');
    }
  };

  // Handler when user selects a different rule
  const handleRuleChange = (newRuleId: string) => {
    setSelectedRuleId(newRuleId);
    const r = availableRules.find((x) => x.id === newRuleId);
    if (r) {
      setPartsReplaced(r.recommendedParts || '');
      setCost(r.estimatedCost ? r.estimatedCost.toString() : '');
    }
  };

  if (!isOpen) return null;

  const interval = currentRule?.intervalHours || 250;
  const nextScheduledHours = Number((hoursAtService + interval).toFixed(1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMachineId || !selectedRuleId) {
      setError('Por favor seleccione máquina y el tipo de mantenimiento a registrar');
      return;
    }

    if (hoursAtService <= 0) {
      setError('El horómetro del servicio debe ser válido');
      return;
    }

    try {
      setIsSubmitting(true);
      await dbService.completeService({
        machineId: selectedMachineId,
        ruleId: selectedRuleId,
        serviceDate,
        hoursAtService,
        technicianName: technicianName.trim() || 'Técnico Mecánico',
        partsReplaced: partsReplaced.trim() || 'Repuestos y lubricantes según pauta',
        cost: parseFloat(cost) || 0,
        workOrderNumber: workOrderNumber.trim(),
        notes: notes.trim(),
        customNextDueHours: nextScheduledHours,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el servicio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-zinc-900 px-6 py-4 flex items-center justify-between border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/40 rounded-lg text-emerald-300">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Registrar Mantenimiento Realizado
              </h2>
              <p className="text-xs text-emerald-100/80">
                Cambio de aceite, filtro o servicio completado. Se reinicia el contador de horas para la siguiente alarma.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800/80 text-red-200 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Machine & Rule Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Maquinaria
              </label>
              <select
                value={selectedMachineId}
                onChange={(e) => handleMachineChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.currentHours.toFixed(1)} h)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tarea / Componente Mantenido
              </label>
              <select
                value={selectedRuleId}
                onChange={(e) => handleRuleChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {availableRules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.taskName} (Cada {r.intervalHours} h)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Information Banner */}
          {currentRule && currentMachine && (
            <div className="bg-zinc-950 border border-emerald-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  Reinicio de Ciclo de Mantenimiento
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Se registra a las <strong className="text-white">{hoursAtService} h</strong>.
                  El próximo cambio vencerá a las{' '}
                  <strong className="text-emerald-400 font-mono text-sm">{nextScheduledHours} hrs</strong>{' '}
                  (intervalo de {interval} horas).
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-zinc-400 block">Horómetro Máquina</span>
                <HorometerDisplay hours={currentMachine.currentHours} size="sm" label="" />
              </div>
            </div>
          )}

          {/* Horometer at service & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                Horómetro Exacto al Realizar el Servicio (hrs)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={hoursAtService}
                onChange={(e) => setHoursAtService(parseFloat(e.target.value) || 0)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha de Ejecución
              </label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Technician & Work Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Mecánico Responsable / Taller
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Ej. Roberto Quintero (Mecánico Senior)"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" /> N° Orden de Trabajo (OT)
              </label>
              <input
                type="text"
                value={workOrderNumber}
                onChange={(e) => setWorkOrderNumber(e.target.value)}
                placeholder="Ej. OT-2026-105"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Parts Replaced & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-zinc-400">
                Repuestos, Filtros y Lubricantes Instalados
              </label>
              <input
                type="text"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                placeholder="Ej. 6 galones Aceite CAT 15W-40, Filtro de aceite 1R-0716"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" /> Costo Total ($ COP)
                </label>
                {parseFloat(cost) > 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    {formatCOP(parseFloat(cost))}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Ej. 850000"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-7 pr-12 py-2 text-sm text-zinc-100 font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">COP</span>
              </div>
              <div className="flex gap-1 flex-wrap pt-0.5">
                {[150000, 350000, 500000, 850000, 1200000, 2000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCost(preset.toString())}
                    className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono"
                  >
                    ${(preset / 1000).toLocaleString('es-CO')}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Observaciones Técnicas o Hallazgos</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Sin virutas en tapón magnético. Presión de aceite normal a 1800 RPM..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 resize-none"
            />
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
              className="px-6 py-2 text-sm font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar Servicio y Resetear Alarma
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
