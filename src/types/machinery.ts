export type MachineCategory =
  | 'Excavadora'
  | 'Retroexcavadora'
  | 'Bulldozer / Tractor'
  | 'Cargador Frontal'
  | 'Motoniveladora'
  | 'Volqueta / Camión'
  | 'Compactador / Rodillo'
  | 'Minicargador'
  | 'Grúa / Telescópico'
  | 'Generador / Compresor'
  | 'Otro';

export type MachineStatus = 'Operativa' | 'En Mantenimiento' | 'Alerta Crítica' | 'Fuera de Servicio';

export type MaintenanceCategory =
  | 'Aceite de Motor'
  | 'Filtro de Aceite'
  | 'Filtro de Combustible'
  | 'Filtro de Aire'
  | 'Sistema Hidráulico'
  | 'Transmisión y Diferenciales'
  | 'Engrase y Articulaciones'
  | 'Mandos Finales'
  | 'Refrigerante y Correas'
  | 'Frenos y Tren de Rodaje'
  | 'Inspección General';

export interface MaintenanceRule {
  id: string;
  machineId: string;
  taskName: string;
  category: MaintenanceCategory;
  intervalHours: number; // Por ejemplo cada 250 horas
  lastServiceHours: number; // Horómetro al que se hizo el último cambio (ej. 2250h)
  nextDueHours: number; // lastServiceHours + intervalHours (ej. 2500h)
  leadTimeHours: number; // Horas de aviso anticipado antes de vencer (ej. 25 horas)
  criticality: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  recommendedParts?: string; // Ej: "Aceite 15W-40 CI-4 + Filtro 1R-0716"
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: string;
  code: string; // ej. EXC-01, TRAC-03
  name: string; // ej. Excavadora CAT 320D
  category: MachineCategory;
  brand: string; // ej. Caterpillar
  model: string; // ej. 320D L
  serialNumber: string; // ej. CAT0320DPG1092
  year: number; // ej. 2021
  currentHours: number; // Horómetro acumulado actual (ej. 2485.5)
  initialHours: number; // Horómetro con el que inició en el sistema
  status: MachineStatus;
  assignedOperator: string;
  location: string; // Frente de obra / Mina / Taller
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoursLog {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  hoursAdded: number; // Horas trabajadas (ej. 8.5)
  previousHours: number; // Horómetro antes de la jornada
  newTotalHours: number; // Horómetro resultante
  operatorName: string;
  shift: 'Mañana' | 'Tarde' | 'Noche' | 'Jornada Continua';
  workDescription: string;
  fuelAddedLiters?: number;
  notes?: string;
  loggedAt: string;
}

export interface ServiceRecord {
  id: string;
  machineId: string;
  ruleId: string;
  taskName: string;
  category: MaintenanceCategory;
  serviceDate: string;
  hoursAtService: number; // Horómetro exacto al realizar el servicio
  technicianName: string; // Mecánico o taller externo
  partsReplaced: string;
  cost: number;
  workOrderNumber?: string;
  notes?: string;
  nextScheduledHours: number;
  recordedAt: string;
}

export type AlertSeverity = 'vencido' | 'proximo' | 'normal';

export interface MaintenanceAlert {
  id: string;
  ruleId: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  machineCategory: MachineCategory;
  taskName: string;
  category: MaintenanceCategory;
  currentHours: number;
  lastServiceHours: number;
  nextDueHours: number;
  hoursRemaining: number; // nextDueHours - currentHours (negativo si está vencido)
  percentageUsed: number; // 0 a 100+ %
  severity: AlertSeverity;
  criticality: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  leadTimeHours: number;
  recommendedParts?: string;
}

export interface DatabaseState {
  version: number;
  lastSynced: string;
  machines: Machine[];
  maintenanceRules: MaintenanceRule[];
  hoursLogs: HoursLog[];
  serviceRecords: ServiceRecord[];
}
