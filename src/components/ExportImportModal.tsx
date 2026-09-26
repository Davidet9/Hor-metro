import React, { useState } from 'react';
import { dbService } from '../services/database';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleExportDownload = () => {
    try {
      const dataStr = dbService.exportDatabaseJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `horomax_backup_flota_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'Copia de seguridad descargada exitosamente en formato JSON.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al exportar: ' + err.message });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await dbService.importDatabaseJson(content);
        setStatusMessage({
          type: 'success',
          text: 'Base de datos restaurada correctamente desde el archivo.',
        });
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: 'Archivo inválido o corrupto: ' + err.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportText = async () => {
    if (!jsonText.trim()) return;
    try {
      await dbService.importDatabaseJson(jsonText);
      setStatusMessage({
        type: 'success',
        text: 'Base de datos restaurada correctamente desde texto JSON.',
      });
      setJsonText('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Error al importar JSON: ' + err.message,
      });
    }
  };

  const handleResetDemo = async () => {
    await dbService.resetToDemoData();
    setStatusMessage({
      type: 'success',
      text: 'Base de datos restablecida con los datos demo de flota y maquinaria.',
    });
    setConfirmReset(false);
    if (onSuccess) onSuccess();
  };

  const dbState = dbService.getState();
  const syncStatus = dbService.getSyncStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-800 via-zinc-850 to-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Gestión y Respaldo de Base de Datos
              </h2>
              <p className="text-xs text-zinc-400">
                Almacenamiento persistente, copias de seguridad e importación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                  : 'bg-red-950/80 border border-red-700 text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Database Health Summary */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <Server className="w-4 h-4 text-emerald-400" />
                Estado del Motor de Base de Datos
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {syncStatus === 'synced' ? 'Conectada & Sincronizada' : 'Modo Persistente Activo'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                <div className="text-zinc-400">Máquinas</div>
                <div className="text-lg font-bold text-white">{dbState.machines.length}</div>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                <div className="text-zinc-400">Reglas Alertas</div>
                <div className="text-lg font-bold text-amber-400">{dbState.maintenanceRules.length}</div>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                <div className="text-zinc-400">Logs Horómetros</div>
                <div className="text-lg font-bold text-blue-400">{dbState.hoursLogs.length}</div>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                <div className="text-zinc-400">Servicios Hechos</div>
                <div className="text-lg font-bold text-emerald-400">{dbState.serviceRecords.length}</div>
              </div>
            </div>
          </div>

          {/* Export section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              1. Exportar Copia de Seguridad (Backup JSON)
            </h3>
            <p className="text-xs text-zinc-400">
              Descarga un archivo con toda tu flota, horómetros acumulados, reglas de intervalo y bitácoras completas.
            </p>
            <button
              onClick={handleExportDownload}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 border border-zinc-700"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Descargar Archivo de Base de Datos (.JSON)
            </button>
          </div>

          {/* Import section */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              2. Restaurar o Importar Base de Datos
            </h3>
            <p className="text-xs text-zinc-400">
              Carga un archivo de respaldo previo para restablecer el estado completo del sistema.
            </p>

            <label className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 border border-zinc-700">
              <Upload className="w-4 h-4 text-blue-400" />
              Seleccionar Archivo JSON de Respaldo
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {/* Reset Demo Data */}
          <div className="space-y-2 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Restablecer Datos de Demostración
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Si deseas reiniciar la aplicación con la flota de ejemplo (Excavadora 320D, Bulldozer D65, Retroexcavadora 420F, etc.):
            </p>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-red-400 hover:text-red-300 underline font-medium"
              >
                Cargar datos de demostración predeterminados
              </button>
            ) : (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-center justify-between gap-3 text-xs text-red-200">
                <span>¿Confirmas sobreescribir con los datos de fábrica?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded"
                  >
                    No
                  </button>
                  <button
                    onClick={handleResetDemo}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded"
                  >
                    Sí, restablecer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 px-6 py-3 flex justify-end border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
