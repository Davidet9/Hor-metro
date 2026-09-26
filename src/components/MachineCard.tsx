import React, { useState } from 'react';
import { Machine, MaintenanceRule } from '../types/machinery';
import { HorometerDisplay } from './HorometerDisplay';
import {
  Truck,
  Plus,
  Sliders,
  Wrench,
  Edit2,
  Trash2,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';

interface MachineCardProps {
  machine: Machine;
  rules: MaintenanceRule[];
  onLogHours: (machineId: string) => void;
  onConfigureRules: (machineId: string) => void;
  onEditMachine: (machine: Machine) => void;
  onDeleteMachine: (machineId: string) => void;
  onRecordService: (machineId: string, ruleId?: string) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  rules,
  onLogHours,
  onConfigureRules,
  onEditMachine,
  onDeleteMachine,
  onRecordService,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Check rules status for this machine
  const overdueRules = rules.filter((r) => machine.currentHours >= r.nextDueHours);
  const dueSoonRules = rules.filter(
    (r) =>
      machine.currentHours < r.nextDueHours &&
      r.nextDueHours - machine.currentHours <= r.leadTimeHours
  );

  const hasOverdue = overdueRules.length > 0;
  const hasDueSoon = dueSoonRules.length > 0;

  const statusColors = {
    Operativa: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
    'En Mantenimiento': 'bg-blue-950/80 text-blue-300 border-blue-700/80',
    'Alerta Crítica': 'bg-red-950/90 text-red-200 border-red-600 animate-pulse',
    'Fuera de Servicio': 'bg-zinc-800 text-zinc-400 border-zinc-700',
  }[machine.status];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition flex flex-col justify-between shadow-lg">
      <div>
        {/* Top Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400 text-sm bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
                  {machine.code}
                </span>
                <span className="text-xs text-zinc-400 font-semibold">{machine.category}</span>
              </div>
              <h3 className="font-bold text-white text-sm sm:text-base leading-snug mt-0.5">
                {machine.name}
              </h3>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>
            {hasOverdue ? '¡Alerta Aceite/Filtro!' : machine.status}
          </span>
        </div>

        {/* Horometer Box & Specs */}
        <div className="p-4 space-y-3.5">
          <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-xs">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                Horas Acumuladas
              </span>
              <span className="text-zinc-200 text-xs font-medium">
                Inicio: {machine.initialHours} h
              </span>
            </div>
            <HorometerDisplay hours={machine.currentHours} size="sm" label="" />
          </div>

          {/* Machine Info Tags */}
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{machine.assignedOperator || 'Sin operador'}</span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{machine.location || 'Base Principal'}</span>
            </div>
          </div>

          {/* Maintenance Rules Summary List */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold uppercase tracking-wider">
                Intervalos de Mantenimiento ({rules.length})
              </span>
              <button
                onClick={() => onConfigureRules(machine.id)}
                className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" />
                Configurar Horas
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-center text-xs text-zinc-400">
                Sin reglas configuradas.{' '}
                <button
                  onClick={() => onConfigureRules(machine.id)}
                  className="text-amber-400 hover:underline"
                >
                  Agregar regla de aceite o filtro
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {rules.map((rule) => {
                  const remaining = rule.nextDueHours - machine.currentHours;
                  const isVencido = remaining <= 0;
                  const isProximo = !isVencido && remaining <= rule.leadTimeHours;

                  return (
                    <div
                      key={rule.id}
                      className={`p-2 rounded-lg text-xs border flex items-center justify-between transition ${
                        isVencido
                          ? 'bg-red-950/40 border-red-700/60 text-red-200'
                          : isProximo
                          ? 'bg-amber-950/30 border-amber-600/50 text-amber-200'
                          : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-white truncate text-[11px]">
                          {rule.taskName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Cada {rule.intervalHours} h • Meta: {rule.nextDueHours} h
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isVencido ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">
                            ¡Vencido {Math.abs(remaining).toFixed(1)} h!
                          </span>
                        ) : isProximo ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold text-[10px]">
                            Faltan {remaining.toFixed(1)} h
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400">
                            Faltan {remaining.toFixed(1)} h
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center gap-2">
        {isConfirmingDelete ? (
          <div className="w-full bg-red-950/90 border border-red-700 p-2 rounded-lg flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-red-200 truncate">
              ¿Eliminar {machine.code}?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-semibold"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  onDeleteMachine(machine.id);
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => onLogHours(machine.id)}
              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Horas
            </button>

            <button
              onClick={() => onRecordService(machine.id)}
              title="Registrar mantenimiento o cambio de aceite"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-lg text-xs font-semibold transition border border-zinc-700"
            >
              <Wrench className="w-4 h-4" />
            </button>

            <button
              onClick={() => onEditMachine(machine)}
              title="Editar información de la máquina"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs transition border border-zinc-700"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              title="Eliminar máquina"
              className="p-2 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded-lg text-xs transition border border-zinc-700 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
