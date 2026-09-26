import React, { useState, useEffect } from 'react';
import { Machine, MaintenanceRule } from '../types/machinery';
import { dbService } from '../services/database';
import { HorometerDisplay } from './HorometerDisplay';
import {
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Fuel,
  User,
  Calendar,
  Layers,
  FileText,
  Plus,
} from 'lucide-react';

interface LogHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  maintenanceRules: MaintenanceRule[];
  preselectedMachineId?: string;
  onSuccess?: () => void;
}

export const LogHoursModal: React.FC<LogHoursModalProps> = ({
  isOpen,
  onClose,
  machines,
  maintenanceRules,
  preselectedMachineId,
  onSuccess,
}) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    preselectedMachineId || (machines.length > 0 ? machines[0].id : '')
  );

  const [inputMode, setInputMode] = useState<'hoursAdded' | 'exactHorometer'>('hoursAdded');
  const [hoursAddedInput, setHoursAddedInput] = useState<string>('8.0');
  const [exactHorometerInput, setExactHorometerInput] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [operatorName, setOperatorName] = useState<string>('');
  const [shift, setShift] = useState<'Mañana' | 'Tarde' | 'Noche' | 'Jornada Continua'>(
    'Jornada Continua'
  );
  const [workDescription, setWorkDescription] = useState<string>('');
  const [fuelAddedLiters, setFuelAddedLiters] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when preselectedMachineId changes
  useEffect(() => {
    if (preselectedMachineId) {
      setSelectedMachineId(preselectedMachineId);
    } else if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
    }
  }, [preselectedMachineId, machines]);

  // Set default operator name when machine changes
  useEffect(() => {
    const currentMachine = machines.find((m) => m.id === selectedMachineId);
    if (currentMachine) {
      setOperatorName(currentMachine.assignedOperator || '');
      setExactHorometerInput((currentMachine.currentHours + 8.0).toFixed(1));
    }
  }, [selectedMachineId, machines]);

  if (!isOpen) return null;

  const currentMachine = machines.find((m) => m.id === selectedMachineId);
  const currentHours = currentMachine ? currentMachine.currentHours : 0;

  // Calculate resulting hours
  let calculatedHoursAdded = 0;
  let calculatedTotalHours = currentHours;

  if (inputMode === 'hoursAdded') {
    calculatedHoursAdded = parseFloat(hoursAddedInput) || 0;
    calculatedTotalHours = Number((currentHours + calculatedHoursAdded).toFixed(1));
  } else {
    const exact = parseFloat(exactHorometerInput) || currentHours;
    calculatedTotalHours = Number(exact.toFixed(1));
    calculatedHoursAdded = Number((calculatedTotalHours - currentHours).toFixed(1));
  }

  // Check impact on maintenance rules
  const machineRules = maintenanceRules.filter((r) => r.machineId === selectedMachineId);
  const triggeredAlarms = machineRules.filter((rule) => {
    const wasOverdue = currentHours >= rule.nextDueHours;
    const willBeOverdue = calculatedTotalHours >= rule.nextDueHours;
    return willBeOverdue && (!wasOverdue || calculatedHoursAdded > 0);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMachineId) {
      setError('Seleccione una máquina');
      return;
    }

    if (calculatedHoursAdded <= 0) {
      setError('Las horas sumadas deben ser mayores a cero');
      return;
    }

    if (calculatedTotalHours < currentHours) {
      setError('El nuevo horómetro no puede ser menor al horómetro actual de la máquina');
      return;
    }

    try {
      setIsSubmitting(true);
      await dbService.logHours({
        machineId: selectedMachineId,
        hoursToAdd: calculatedHoursAdded,
        exactEndingHours: inputMode === 'exactHorometer' ? calculatedTotalHours : undefined,
        date,
        operatorName: operatorName.trim() || 'Operador de Turno',
        shift,
        workDescription: workDescription.trim() || 'Operación regular en obra/frente',
        fuelAddedLiters: fuelAddedLiters ? parseFloat(fuelAddedLiters) : undefined,
        notes: notes.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar horas');
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
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Registrar Horómetro de Servicio
              </h2>
              <p className="text-xs text-amber-100/80">
                Suma horas de funcionamiento al registro diario y evalúa las alarmas de mantenimiento
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
            <div className="p-3 bg-red-950/80 border border-red-800/80 text-red-200 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Machine Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Seleccionar Maquinaria Pesada
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-zinc-100 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} - ({m.currentHours.toFixed(1)} hrs actuales) - {m.location}
                </option>
              ))}
            </select>
          </div>

          {/* Current vs New Horometer Comparison Box */}
          {currentMachine && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs text-zinc-400 mb-1">Horómetro Actual en Sistema</span>
                <HorometerDisplay hours={currentHours} size="sm" label="" />
              </div>

              <div className="flex items-center text-amber-500 font-bold text-xl px-2">
                <span>+ {calculatedHoursAdded.toFixed(1)} h</span>
                <span className="text-zinc-600 mx-2">➔</span>
              </div>

              <div className="flex flex-col items-center sm:items-end">
                <span className="text-xs text-amber-400 font-semibold mb-1">Nuevo Horómetro Resultante</span>
                <HorometerDisplay hours={calculatedTotalHours} size="sm" label="" />
              </div>
            </div>
          )}

          {/* Input Mode Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Método de Registro de Horas
              </label>
              <div className="inline-flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('hoursAdded')}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    inputMode === 'hoursAdded'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Horas Trabajadas en Turno (+h)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('exactHorometer');
                    setExactHorometerInput((currentHours + (parseFloat(hoursAddedInput) || 8.0)).toFixed(1));
                  }}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    inputMode === 'exactHorometer'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Lectura Final de Horómetro (Total)
                </button>
              </div>
            </div>

            {inputMode === 'hoursAdded' ? (
              <div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="48"
                    value={hoursAddedInput}
                    onChange={(e) => setHoursAddedInput(e.target.value)}
                    placeholder="Ej. 8.5"
                    required
                    className="w-full bg-zinc-950 border border-amber-600/60 rounded-lg px-4 py-3 text-2xl font-mono font-bold text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    HORAS DE SERVICIO
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {[4, 6, 8, 10, 12].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHoursAddedInput(preset.toString())}
                      className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                    >
                      +{preset} hrs
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min={currentHours}
                    value={exactHorometerInput}
                    onChange={(e) => setExactHorometerInput(e.target.value)}
                    placeholder={`Mayor o igual a ${currentHours}`}
                    required
                    className="w-full bg-zinc-950 border border-amber-600/60 rounded-lg px-4 py-3 text-2xl font-mono font-bold text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    LECTURA ACTUAL DE RELOJ
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Ingrese la lectura numérica que marca físicamente el horómetro de la máquina.
                </p>
              </div>
            )}
          </div>

          {/* Maintenance Alarm Triggers Preview */}
          {triggeredAlarms.length > 0 && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>¡ALERTA DE MANTENIMIENTO PREVENTIVO DETONADA!</span>
              </div>
              <p className="text-xs text-zinc-300">
                Con este nuevo horómetro ({calculatedTotalHours.toFixed(1)} h), se alcanzará o superará el límite en las siguientes tareas:
              </p>
              <div className="space-y-1.5 pt-1">
                {triggeredAlarms.map((rule) => {
                  const diff = calculatedTotalHours - rule.nextDueHours;
                  return (
                    <div
                      key={rule.id}
                      className="bg-black/40 border border-amber-500/30 p-2.5 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{rule.taskName}</span>
                        <div className="text-zinc-400 text-[11px]">
                          Límite programado: {rule.nextDueHours} h (cada {rule.intervalHours} h)
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-600/30 text-red-300 border border-red-500/40 rounded font-semibold text-[11px]">
                        {diff > 0 ? `Vencido por ${diff.toFixed(1)} h` : 'Límite alcanzado'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Shift & Operator Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha del Registro
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Turno / Jornada
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-amber-500"
              >
                <option value="Jornada Continua">Jornada Continua</option>
                <option value="Mañana">Turno Mañana</option>
                <option value="Tarde">Turno Tarde</option>
                <option value="Noche">Turno Noche</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5" /> Diésel Suministrado (Lts)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={fuelAddedLiters}
                onChange={(e) => setFuelAddedLiters(e.target.value)}
                placeholder="Opcional (Lts)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Operator Name */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Nombre del Operador de la Máquina
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Work Description */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Descripción de Trabajo Realizado
            </label>
            <textarea
              rows={2}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Ej. Descapote en banco 3 y cargue de material a volquetas..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
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
              disabled={isSubmitting || calculatedHoursAdded <= 0}
              className="px-6 py-2 text-sm font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Guardando en Base de Datos...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar y Sumar Horas (+{calculatedHoursAdded.toFixed(1)} h)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
