import React from 'react';
import { MaintenanceAlert } from '../types/machinery';
import { HorometerDisplay } from './HorometerDisplay';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Wrench,
  Clock,
  Package,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface AlertCardProps {
  alert: MaintenanceAlert;
  onRecordService: (machineId: string, ruleId: string) => void;
  onLogHours: (machineId: string) => void;
  onEditRule: (ruleId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onRecordService,
  onLogHours,
  onEditRule,
}) => {
  const isOverdue = alert.severity === 'vencido';
  const isDueSoon = alert.severity === 'proximo';

  // Severity styles
  const borderClass = isOverdue
    ? 'border-red-600/80 bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-900 shadow-lg shadow-red-950/40'
    : isDueSoon
    ? 'border-amber-500/70 bg-gradient-to-b from-amber-950/30 via-zinc-900 to-zinc-900 shadow-md shadow-amber-950/30'
    : 'border-zinc-800 bg-zinc-900/90';

  const badgeBg = isOverdue
    ? 'bg-red-600 text-white animate-pulse'
    : isDueSoon
    ? 'bg-amber-500 text-zinc-950 font-bold'
    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40';

  const progressBarColor = isOverdue
    ? 'bg-red-500'
    : isDueSoon
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  const percentClamped = Math.min(100, Math.max(0, alert.percentageUsed));

  return (
    <div
      className={`border rounded-xl p-4.5 transition-all hover:scale-[1.01] flex flex-col justify-between ${borderClass}`}
    >
      <div>
        {/* Top Header: Machine code and Alert Badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-amber-400 font-mono font-bold text-xs rounded">
                {alert.machineCode}
              </span>
              <span className="text-xs text-zinc-400 font-medium truncate max-w-[170px] sm:max-w-xs">
                {alert.machineName}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              {isOverdue && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
              {isDueSoon && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
              {!isOverdue && !isDueSoon && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              <span>{alert.taskName}</span>
            </h3>
          </div>

          {/* Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-tight shrink-0 ${badgeBg}`}>
            {isOverdue && `¡VENCIDO HACE ${Math.abs(alert.hoursRemaining).toFixed(1)} h!`}
            {isDueSoon && `PRÓXIMO: FALTAN ${alert.hoursRemaining.toFixed(1)} h`}
            {!isOverdue && !isDueSoon && `EN ORDEN (${alert.hoursRemaining.toFixed(1)} h)`}
          </div>
        </div>

        {/* Horometer Comparison Box */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 my-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">Horómetro Actual</span>
            <span className="font-mono font-bold text-sm text-zinc-100">
              {alert.currentHours.toFixed(1)} hrs
            </span>
          </div>

          <div className="text-right">
            <span className="text-zinc-400 block text-[11px]">Límite Programado</span>
            <span
              className={`font-mono font-bold text-sm ${
                isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-zinc-300'
              }`}
            >
              {alert.nextDueHours.toFixed(1)} hrs
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Vida útil del ciclo</span>
            <span className="font-mono font-bold text-zinc-200">
              {alert.percentageUsed}% consumido
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${percentClamped}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Último: {alert.lastServiceHours} h</span>
            <span className="text-amber-400/90 font-medium">
              Aviso anticipado: {alert.leadTimeHours} h antes
            </span>
            <span>Meta: {alert.nextDueHours} h</span>
          </div>
        </div>

        {/* Parts Info if available */}
        {alert.recommendedParts && (
          <div className="bg-black/30 border border-zinc-800/60 rounded px-2.5 py-1.5 mb-3 flex items-start gap-1.5 text-xs text-zinc-300">
            <Package className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <span className="truncate">
              <strong className="text-zinc-400">Insumos:</strong> {alert.recommendedParts}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={() => onRecordService(alert.machineId, alert.ruleId)}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
            isOverdue
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : isDueSoon
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Registrar Mantenimiento
        </button>

        <button
          onClick={() => onLogHours(alert.machineId)}
          title="Sumar horas de servicio a esta máquina"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition border border-zinc-700 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Sumar Horas</span>
        </button>

        <button
          onClick={() => onEditRule(alert.ruleId)}
          title="Cambiar intervalo en horas para esta máquina"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition border border-zinc-700"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
