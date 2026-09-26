import React, { useState, useEffect } from 'react';
import { Machine, MachineCategory, MachineStatus } from '../types/machinery';
import { dbService } from '../services/database';
import {
  X,
  Truck,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineToEdit?: Machine | null;
  onSuccess?: () => void;
}

const CATEGORIES: MachineCategory[] = [
  'Excavadora',
  'Retroexcavadora',
  'Bulldozer / Tractor',
  'Cargador Frontal',
  'Motoniveladora',
  'Volqueta / Camión',
  'Compactador / Rodillo',
  'Minicargador',
  'Grúa / Telescópico',
  'Generador / Compresor',
  'Otro',
];

export const MachineModal: React.FC<MachineModalProps> = ({
  isOpen,
  onClose,
  machineToEdit,
  onSuccess,
}) => {
  const isEditing = !!machineToEdit;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MachineCategory>('Excavadora');
  const [brand, setBrand] = useState('Caterpillar');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [currentHours, setCurrentHours] = useState<number>(0);
  const [status, setStatus] = useState<MachineStatus>('Operativa');
  const [assignedOperator, setAssignedOperator] = useState('');
  const [location, setLocation] = useState('Frente Principal');
  const [notes, setNotes] = useState('');
  const [createDefaultRules, setCreateDefaultRules] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (machineToEdit) {
      setCode(machineToEdit.code);
      setName(machineToEdit.name);
      setCategory(machineToEdit.category);
      setBrand(machineToEdit.brand);
      setModel(machineToEdit.model);
      setSerialNumber(machineToEdit.serialNumber);
      setYear(machineToEdit.year);
      setCurrentHours(machineToEdit.currentHours);
      setStatus(machineToEdit.status);
      setAssignedOperator(machineToEdit.assignedOperator);
      setLocation(machineToEdit.location);
      setNotes(machineToEdit.notes || '');
      setCreateDefaultRules(false);
    } else {
      setCode(`M-${Math.floor(10 + Math.random() * 90)}`);
      setName('');
      setCategory('Excavadora');
      setBrand('Caterpillar');
      setModel('');
      setSerialNumber('');
      setYear(new Date().getFullYear());
      setCurrentHours(0);
      setStatus('Operativa');
      setAssignedOperator('');
      setLocation('Frente Principal');
      setNotes('');
      setCreateDefaultRules(true);
    }
  }, [machineToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || !name.trim()) {
      setError('El código y nombre de la máquina son obligatorios');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && machineToEdit) {
        await dbService.updateMachine(machineToEdit.id, {
          code: code.trim(),
          name: name.trim(),
          category,
          brand: brand.trim(),
          model: model.trim(),
          serialNumber: serialNumber.trim(),
          year: Number(year),
          currentHours: Number(currentHours),
          status,
          assignedOperator: assignedOperator.trim(),
          location: location.trim(),
          notes: notes.trim(),
        });
      } else {
        await dbService.addMachine(
          {
            code: code.trim(),
            name: name.trim(),
            category,
            brand: brand.trim(),
            model: model.trim(),
            serialNumber: serialNumber.trim(),
            year: Number(year),
            currentHours: Number(currentHours),
            initialHours: Number(currentHours),
            status,
            assignedOperator: assignedOperator.trim(),
            location: location.trim(),
            notes: notes.trim(),
          },
          createDefaultRules
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la máquina');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-zinc-800 to-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/40 rounded-lg text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isEditing ? 'Editar Maquinaria' : 'Registrar Nueva Máquina en Flota'}
              </h2>
              <p className="text-xs text-zinc-300">
                Ficha técnica, código de inventario y configuración de horómetro
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold">Código / ID Flota *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej. EXC-03"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono font-bold focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-zinc-400 font-semibold">Nombre Descriptivo de Máquina *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Excavadora CAT 330D L"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Category & Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Tipo / Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Caterpillar, Komatsu, Volvo..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej. 330D L"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Serial Number & Year & Horometer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">N° de Serie / Chasis</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Ej. CAT0330D0099"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Año de Fabricación</label>
              <input
                type="number"
                min="1980"
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2020)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-amber-400 font-semibold">
                Horómetro Actual de Entrada (hrs) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={currentHours}
                onChange={(e) => setCurrentHours(parseFloat(e.target.value) || 0)}
                required
                className="w-full bg-zinc-950 border border-amber-600/70 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-bold focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Operator, Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Operador Asignado
              </label>
              <input
                type="text"
                value={assignedOperator}
                onChange={(e) => setAssignedOperator(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Ubicación / Frente de Trabajo
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Mina Norte / Cantera"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Estado Operativo</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Operativa">Operativa (En Servicio)</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Alerta Crítica">Alerta Crítica</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
              </select>
            </div>
          </div>

          {/* Auto Generate Default Maintenance Rules Checkbox (only on create) */}
          {!isEditing && (
            <div className="p-3 bg-zinc-950 border border-amber-600/30 rounded-lg flex items-start gap-3">
              <input
                type="checkbox"
                id="defaultRules"
                checked={createDefaultRules}
                onChange={(e) => setCreateDefaultRules(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="defaultRules" className="text-xs text-zinc-300 cursor-pointer">
                <strong className="text-amber-400 font-semibold block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Generar automáticamente reglas de mantenimiento recomendadas
                </strong>
                Incluye: Cambio de aceite cada 250h, filtro de aceite cada 250h, filtros de combustible cada 500h, filtro de aire cada 500h, engrase cada 50h y aceite hidráulico cada 2,000h. Podrás personalizarlas cuando quieras.
              </label>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Notas / Especificaciones adicionales</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Motor C9 ACERT, capacidad de balde 1.5m3, acople rápido..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Buttons */}
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
                  {isEditing ? 'Guardar Cambios' : 'Registrar Máquina en BD'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
