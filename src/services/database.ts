import {
  DatabaseState,
  Machine,
  MaintenanceRule,
  HoursLog,
  ServiceRecord,
  MaintenanceAlert,
  AlertSeverity,
} from '../types/machinery';
import { INITIAL_DATABASE } from './seedData';

const STORAGE_KEY = 'horomax_machinery_db_v1';
const DB_API_ENDPOINT = '/api/db';

type Listener = (state: DatabaseState) => void;

class MachineryDatabaseService {
  private state: DatabaseState = INITIAL_DATABASE;
  private listeners: Set<Listener> = new Set();
  private isLoaded = false;
  private syncStatus: 'synced' | 'saving' | 'offline' | 'error' = 'synced';

  constructor() {
    this.initialize();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot: DatabaseState = {
      ...this.state,
      machines: [...this.state.machines],
      maintenanceRules: [...this.state.maintenanceRules],
      hoursLogs: [...this.state.hoursLogs],
      serviceRecords: [...(this.state.serviceRecords || [])],
    };
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error notifying database listener', err);
      }
    });
  }

  private normalizeCOP(state: DatabaseState): DatabaseState {
    if (state.serviceRecords) {
      state.serviceRecords.forEach((sr) => {
        if (sr.cost > 0 && sr.cost < 10000) {
          sr.cost = Math.round(sr.cost * 4000);
        }
      });
    }
    if (state.maintenanceRules) {
      state.maintenanceRules.forEach((mr) => {
        if (mr.estimatedCost && mr.estimatedCost > 0 && mr.estimatedCost < 10000) {
          mr.estimatedCost = Math.round(mr.estimatedCost * 4000);
        }
      });
    }
    return state;
  }

  public async initialize(): Promise<DatabaseState> {
    if (this.isLoaded) return this.state;

    // 1. Try local storage first for instant display
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.machines) && parsed.machines.length > 0) {
          this.state = this.normalizeCOP(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not read from localStorage', err);
    }

    // 2. Try fetching from server-side database endpoint
    try {
      const response = await fetch(DB_API_ENDPOINT);
      if (response.ok) {
        const serverData = await response.json();
        if (serverData && Array.isArray(serverData.machines) && serverData.machines.length > 0) {
          this.state = this.normalizeCOP(serverData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          this.syncStatus = 'synced';
        } else {
          // If server file is empty, seed it with our rich initial dataset
          await this.saveToServer(this.state);
        }
      }
    } catch (err) {
      console.info('Server API not reachable or offline, using local persistent storage', err);
      this.syncStatus = 'offline';
    }

    this.isLoaded = true;
    this.notify();
    return this.state;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public getSyncStatus(): 'synced' | 'saving' | 'offline' | 'error' {
    return this.syncStatus;
  }

  private async persist(): Promise<void> {
    this.state.lastSynced = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Error saving to localStorage', e);
    }

    this.notify();
    await this.saveToServer(this.state);
  }

  private async saveToServer(data: DatabaseState): Promise<void> {
    try {
      this.syncStatus = 'saving';
      const response = await fetch(DB_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        this.syncStatus = 'synced';
      } else {
        this.syncStatus = 'offline';
      }
    } catch (err) {
      this.syncStatus = 'offline';
    }
  }

  // --- COMPUTE ALARMS AND STATS ---
  public getAlerts(): MaintenanceAlert[] {
    const alerts: MaintenanceAlert[] = [];
    const { machines, maintenanceRules } = this.state;

    for (const rule of maintenanceRules) {
      const machine = machines.find((m) => m.id === rule.machineId);
      if (!machine) continue;

      const currentHours = machine.currentHours;
      const nextDueHours = rule.nextDueHours;
      const hoursRemaining = Number((nextDueHours - currentHours).toFixed(1));
      const interval = rule.intervalHours || 250;
      const hoursSinceLast = currentHours - rule.lastServiceHours;
      const percentageUsed = Math.min(200, Math.round((hoursSinceLast / interval) * 100));

      let severity: AlertSeverity = 'normal';
      if (currentHours >= nextDueHours) {
        severity = 'vencido';
      } else if (hoursRemaining <= rule.leadTimeHours) {
        severity = 'proximo';
      }

      alerts.push({
        id: `alert-${rule.id}`,
        ruleId: rule.id,
        machineId: machine.id,
        machineCode: machine.code,
        machineName: machine.name,
        machineCategory: machine.category,
        taskName: rule.taskName,
        category: rule.category,
        currentHours,
        lastServiceHours: rule.lastServiceHours,
        nextDueHours,
        hoursRemaining,
        percentageUsed,
        severity,
        criticality: rule.criticality,
        leadTimeHours: rule.leadTimeHours,
        recommendedParts: rule.recommendedParts,
      });
    }

    // Sort: overdue first (most negative hoursRemaining first), then due soon, then normal
    return alerts.sort((a, b) => {
      const rank = { vencido: 0, proximo: 1, normal: 2 };
      if (rank[a.severity] !== rank[b.severity]) {
        return rank[a.severity] - rank[b.severity];
      }
      return a.hoursRemaining - b.hoursRemaining;
    });
  }

  // --- LOG HOURS (REGISTRAR HORAS DE FUNCIONAMIENTO) ---
  public async logHours(params: {
    machineId: string;
    hoursToAdd: number;
    exactEndingHours?: number;
    date: string;
    operatorName: string;
    shift: 'Mañana' | 'Tarde' | 'Noche' | 'Jornada Continua';
    workDescription: string;
    fuelAddedLiters?: number;
    notes?: string;
  }): Promise<{ log: HoursLog; newAlarmsCount: number }> {
    const machine = this.state.machines.find((m) => m.id === params.machineId);
    if (!machine) throw new Error('Máquina no encontrada en la base de datos');

    const previousHours = machine.currentHours;
    let hoursAdded = params.hoursToAdd;
    let newTotalHours = previousHours + hoursAdded;

    // If operator input the exact ending horometer number directly:
    if (params.exactEndingHours !== undefined && params.exactEndingHours > previousHours) {
      newTotalHours = Number(params.exactEndingHours.toFixed(1));
      hoursAdded = Number((newTotalHours - previousHours).toFixed(1));
    } else {
      newTotalHours = Number((previousHours + hoursAdded).toFixed(1));
    }

    // Create log record
    const logId = 'hl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newLog: HoursLog = {
      id: logId,
      machineId: machine.id,
      date: params.date,
      hoursAdded,
      previousHours,
      newTotalHours,
      operatorName: params.operatorName || machine.assignedOperator || 'Operador en turno',
      shift: params.shift,
      workDescription: params.workDescription,
      fuelAddedLiters: params.fuelAddedLiters ? Number(params.fuelAddedLiters) : undefined,
      notes: params.notes,
      loggedAt: new Date().toISOString(),
    };

    // Update machine hours and timestamp
    machine.currentHours = newTotalHours;
    machine.updatedAt = new Date().toISOString();

    // Check if machine status needs update
    const machineRules = this.state.maintenanceRules.filter((r) => r.machineId === machine.id);
    const hasOverdue = machineRules.some((r) => newTotalHours >= r.nextDueHours && (r.criticality === 'Crítica' || r.criticality === 'Alta'));
    if (hasOverdue) {
      machine.status = 'Alerta Crítica';
    } else if (machine.status === 'Alerta Crítica') {
      machine.status = 'Operativa';
    }

    this.state.hoursLogs.unshift(newLog);
    await this.persist();

    // Calculate how many overdue alerts exist for this machine now
    const overdueCount = machineRules.filter((r) => newTotalHours >= r.nextDueHours).length;
    return { log: newLog, newAlarmsCount: overdueCount };
  }

  // --- RECORD SERVICE COMPLETED (REGISTRAR MANTENIMIENTO REALIZADO) ---
  public async completeService(params: {
    machineId: string;
    ruleId: string;
    serviceDate: string;
    hoursAtService: number;
    technicianName: string;
    partsReplaced: string;
    cost: number;
    workOrderNumber?: string;
    notes?: string;
    customNextDueHours?: number;
  }): Promise<ServiceRecord> {
    const machine = this.state.machines.find((m) => m.id === params.machineId);
    if (!machine) throw new Error('Máquina no encontrada');

    const rule = this.state.maintenanceRules.find((r) => r.id === params.ruleId);
    if (!rule) throw new Error('Regla de mantenimiento no encontrada');

    const nextHours = params.customNextDueHours || (params.hoursAtService + rule.intervalHours);

    // Update the rule's baseline
    rule.lastServiceHours = params.hoursAtService;
    rule.nextDueHours = nextHours;
    rule.updatedAt = new Date().toISOString();

    const recordId = 'sr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const record: ServiceRecord = {
      id: recordId,
      machineId: machine.id,
      ruleId: rule.id,
      taskName: rule.taskName,
      category: rule.category,
      serviceDate: params.serviceDate,
      hoursAtService: params.hoursAtService,
      technicianName: params.technicianName,
      partsReplaced: params.partsReplaced,
      cost: Number(params.cost || 0),
      workOrderNumber: params.workOrderNumber,
      notes: params.notes,
      nextScheduledHours: nextHours,
      recordedAt: new Date().toISOString(),
    };

    // Re-check machine status
    const machineRules = this.state.maintenanceRules.filter((r) => r.machineId === machine.id);
    const stillHasCriticalOverdue = machineRules.some(
      (r) => machine.currentHours >= r.nextDueHours && (r.criticality === 'Crítica' || r.criticality === 'Alta')
    );
    if (!stillHasCriticalOverdue && machine.status === 'Alerta Crítica') {
      machine.status = 'Operativa';
    }

    if (!Array.isArray(this.state.serviceRecords)) {
      this.state.serviceRecords = [];
    }
    this.state.serviceRecords = [record, ...this.state.serviceRecords];
    await this.persist();
    return record;
  }

  // --- MACHINE CRUD ---
  public async addMachine(
    machineData: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>,
    defaultRulesTemplate?: boolean
  ): Promise<Machine> {
    const id = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();

    const newMachine: Machine = {
      ...machineData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.state.machines.push(newMachine);

    // If requested or by default, generate sensible standard maintenance intervals for heavy machinery
    if (defaultRulesTemplate !== false) {
      const current = newMachine.currentHours;
      const defaultRules: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          machineId: id,
          taskName: 'Cambio de Aceite de Motor 15W-40',
          category: 'Aceite de Motor',
          intervalHours: 250,
          lastServiceHours: current,
          nextDueHours: current + 250,
          leadTimeHours: 25,
          criticality: 'Crítica',
          recommendedParts: 'Aceite de motor según especificación del fabricante',
          estimatedCost: 750000,
        },
        {
          machineId: id,
          taskName: 'Filtro de Aceite de Motor',
          category: 'Filtro de Aceite',
          intervalHours: 250,
          lastServiceHours: current,
          nextDueHours: current + 250,
          leadTimeHours: 25,
          criticality: 'Crítica',
          recommendedParts: 'Filtro de aceite original o equivalente de alto rendimiento',
          estimatedCost: 160000,
        },
        {
          machineId: id,
          taskName: 'Filtros de Combustible (Primario y Secundario)',
          category: 'Filtro de Combustible',
          intervalHours: 500,
          lastServiceHours: current,
          nextDueHours: current + 500,
          leadTimeHours: 35,
          criticality: 'Alta',
          recommendedParts: 'Juego de filtros separador de agua y combustible fino',
          estimatedCost: 320000,
        },
        {
          machineId: id,
          taskName: 'Filtro de Aire de Motor (Primario/Secundario)',
          category: 'Filtro de Aire',
          intervalHours: 500,
          lastServiceHours: current,
          nextDueHours: current + 500,
          leadTimeHours: 40,
          criticality: 'Media',
          recommendedParts: 'Elemento filtrante primario y de seguridad',
          estimatedCost: 380000,
        },
        {
          machineId: id,
          taskName: 'Engrase General de Pasadores y Articulaciones',
          category: 'Engrase y Articulaciones',
          intervalHours: 50,
          lastServiceHours: current,
          nextDueHours: current + 50,
          leadTimeHours: 10,
          criticality: 'Baja',
          recommendedParts: 'Grasa EP2 de litio o molibdeno',
          estimatedCost: 90000,
        },
        {
          machineId: id,
          taskName: 'Aceite y Filtros del Sistema Hidráulico',
          category: 'Sistema Hidráulico',
          intervalHours: 2000,
          lastServiceHours: current,
          nextDueHours: current + 2000,
          leadTimeHours: 60,
          criticality: 'Alta',
          recommendedParts: 'Aceite hidráulico ISO 46 / 68 + Filtros de retorno',
          estimatedCost: 1600000,
        },
      ];

      for (const r of defaultRules) {
        this.state.maintenanceRules.push({
          ...r,
          id: 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await this.persist();
    return newMachine;
  }

  public async updateMachine(id: string, data: Partial<Machine>): Promise<Machine> {
    const index = this.state.machines.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Máquina no encontrada');

    this.state.machines[index] = {
      ...this.state.machines[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.persist();
    return this.state.machines[index];
  }

  public async deleteMachine(id: string): Promise<void> {
    this.state.machines = this.state.machines.filter((m) => m.id !== id);
    this.state.maintenanceRules = this.state.maintenanceRules.filter((r) => r.machineId !== id);
    this.state.hoursLogs = this.state.hoursLogs.filter((l) => l.machineId !== id);
    this.state.serviceRecords = this.state.serviceRecords.filter((s) => s.machineId !== id);
    await this.persist();
  }

  // --- MAINTENANCE RULES CRUD (DEFINIR INTERVALOS POR MÁQUINA) ---
  public async addMaintenanceRule(
    ruleData: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenanceRule> {
    const id = 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const newRule: MaintenanceRule = {
      ...ruleData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.state.maintenanceRules.push(newRule);
    await this.persist();
    return newRule;
  }

  public async updateMaintenanceRule(id: string, data: Partial<MaintenanceRule>): Promise<MaintenanceRule> {
    const index = this.state.maintenanceRules.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Regla no encontrada');

    const updated = {
      ...this.state.maintenanceRules[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // If interval or lastService was modified, recalculate nextDueHours if not explicitly set
    if (data.intervalHours !== undefined || data.lastServiceHours !== undefined) {
      if (data.nextDueHours === undefined) {
        updated.nextDueHours = updated.lastServiceHours + updated.intervalHours;
      }
    }

    this.state.maintenanceRules[index] = updated;
    await this.persist();
    return updated;
  }

  public async deleteMaintenanceRule(id: string): Promise<void> {
    this.state.maintenanceRules = this.state.maintenanceRules.filter((r) => r.id !== id);
    await this.persist();
  }

  // --- DELETE LOG OR SERVICE ---
  public async deleteHoursLog(id: string): Promise<void> {
    this.state.hoursLogs = this.state.hoursLogs.filter((l) => l.id !== id);
    await this.persist();
  }

  public async deleteServiceRecord(id: string): Promise<void> {
    this.state.serviceRecords = this.state.serviceRecords.filter((s) => s.id !== id);
    await this.persist();
  }

  // --- BACKUP & RESTORE ---
  public exportDatabaseJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public async importDatabaseJson(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.machines)) {
        throw new Error('El archivo no tiene el formato válido de Horomax');
      }
      this.state = {
        version: parsed.version || 1,
        lastSynced: new Date().toISOString(),
        machines: parsed.machines || [],
        maintenanceRules: parsed.maintenanceRules || [],
        hoursLogs: parsed.hoursLogs || [],
        serviceRecords: parsed.serviceRecords || [],
      };
      await this.persist();
      return true;
    } catch (err) {
      console.error('Failed to import database', err);
      throw err;
    }
  }

  public async resetToDemoData(): Promise<void> {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    await this.persist();
  }
}

export const dbService = new MachineryDatabaseService();
