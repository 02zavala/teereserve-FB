import type { BookingStatus } from '@/types';

// Tipos para el sistema de auditoría
export interface AuditEntry {
  id: string;
  bookingId: string;
  action: AuditAction;
  performedBy: {
    id: string;
    name: string;
    role: 'admin' | 'customer' | 'system';
    email?: string;
  };
  timestamp: Date;
  changes: AuditChange[];
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  notes?: string;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  fieldType: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
}

export type AuditAction = 
  | 'booking_created'
  | 'booking_updated'
  | 'booking_canceled'
  | 'booking_rescheduled'
  | 'status_changed'
  | 'payment_processed'
  | 'payment_refunded'
  | 'payment_disputed'
  | 'check_in'
  | 'check_out'
  | 'no_show_marked'
  | 'notes_added'
  | 'customer_contacted'
  | 'dispute_resolved'
  | 'policy_override'
  | 'data_exported'
  | 'data_deleted';

export interface AuditFilter {
  bookingId?: string;
  performedBy?: string;
  action?: AuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  role?: 'admin' | 'customer' | 'system';
  field?: string;
}

export interface AuditSummary {
  totalEntries: number;
  actionCounts: Record<AuditAction, number>;
  topPerformers: Array<{
    userId: string;
    name: string;
    actionCount: number;
  }>;
  recentActivity: AuditEntry[];
  criticalActions: AuditEntry[];
}

// Configuración del sistema de auditoría
export const AuditConfig = {
  // Acciones que requieren razón obligatoria
  requireReason: [
    'booking_canceled',
    'policy_override',
    'data_deleted',
    'dispute_resolved'
  ] as AuditAction[],
  
  // Acciones consideradas críticas
  criticalActions: [
    'booking_canceled',
    'payment_refunded',
    'payment_disputed',
    'policy_override',
    'data_deleted'
  ] as AuditAction[],
  
  // Retención de datos (en días)
  retentionPeriod: 2555, // 7 años
  
  // Campos sensibles que requieren auditoría especial
  sensitiveFields: [
    'totalPrice',
    'paymentStatus',
    'customerEmail',
    'customerPhone',
    'status'
  ],
  
  // Configuración de alertas
  alerts: {
    multipleFailedLogins: 5,
    massDataExport: 100,
    suspiciousActivity: true
  }
};

// Servicio de auditoría
export class AuditService {
  private static instance: AuditService;
  private entries: Map<string, AuditEntry[]> = new Map();
  
  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }
  
  // Registrar una acción de auditoría
  async logAction({
    bookingId,
    action,
    performedBy,
    changes = [],
    metadata = {},
    ipAddress,
    userAgent,
    reason,
    notes
  }: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    
    // Validar si la acción requiere razón
    if (AuditConfig.requireReason.includes(action) && !reason) {
      throw new Error(`La acción '${action}' requiere una razón.`);
    }
    
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookingId,
      action,
      performedBy,
      timestamp: new Date(),
      changes,
      metadata,
      ipAddress,
      userAgent,
      reason,
      notes
    };
    
    // Almacenar la entrada
    if (!this.entries.has(bookingId)) {
      this.entries.set(bookingId, []);
    }
    this.entries.get(bookingId)!.push(entry);
    
    // Verificar alertas
    await this.checkAlerts(entry);
    
    // En un sistema real, esto se guardaría en la base de datos
    console.log('Audit entry logged:', entry);
    
    return entry;
  }
  
  // Obtener historial de auditoría para una reserva
  async getBookingAuditHistory(bookingId: string): Promise<AuditEntry[]> {
    const entries = this.entries.get(bookingId) || [];
    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  // Buscar entradas de auditoría con filtros
  async searchAuditEntries(filter: AuditFilter, limit = 100): Promise<AuditEntry[]> {
    let allEntries: AuditEntry[] = [];
    
    // Recopilar todas las entradas
    for (const entries of this.entries.values()) {
      allEntries.push(...entries);
    }
    
    // Aplicar filtros
    let filtered = allEntries;
    
    if (filter.bookingId) {
      filtered = filtered.filter(entry => entry.bookingId === filter.bookingId);
    }
    
    if (filter.performedBy) {
      filtered = filtered.filter(entry => entry.performedBy.id === filter.performedBy);
    }
    
    if (filter.action) {
      filtered = filtered.filter(entry => entry.action === filter.action);
    }
    
    if (filter.role) {
      filtered = filtered.filter(entry => entry.performedBy.role === filter.role);
    }
    
    if (filter.dateFrom) {
      filtered = filtered.filter(entry => entry.timestamp >= filter.dateFrom!);
    }
    
    if (filter.dateTo) {
      filtered = filtered.filter(entry => entry.timestamp <= filter.dateTo!);
    }
    
    if (filter.field) {
      filtered = filtered.filter(entry => 
        entry.changes.some(change => change.field === filter.field)
      );
    }
    
    // Ordenar por fecha descendente y limitar
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Obtener resumen de auditoría
  async getAuditSummary(dateFrom?: Date, dateTo?: Date): Promise<AuditSummary> {
    const entries = await this.searchAuditEntries({ dateFrom, dateTo }, 10000);
    
    // Contar acciones
    const actionCounts = {} as Record<AuditAction, number>;
    const performerCounts = new Map<string, { name: string; count: number }>();
    
    entries.forEach(entry => {
      // Contar acciones
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      
      // Contar por usuario
      const key = entry.performedBy.id;
      const current = performerCounts.get(key) || { name: entry.performedBy.name, count: 0 };
      performerCounts.set(key, { ...current, count: current.count + 1 });
    });
    
    // Top performers
    const topPerformers = Array.from(performerCounts.entries())
      .map(([userId, data]) => ({ userId, name: data.name, actionCount: data.count }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);
    
    // Actividad reciente
    const recentActivity = entries.slice(0, 20);
    
    // Acciones críticas
    const criticalActions = entries
      .filter(entry => AuditConfig.criticalActions.includes(entry.action))
      .slice(0, 50);
    
    return {
      totalEntries: entries.length,
      actionCounts,
      topPerformers,
      recentActivity,
      criticalActions
    };
  }
  
  // Verificar alertas
  private async checkAlerts(entry: AuditEntry): Promise<void> {
    // Verificar acciones críticas
    if (AuditConfig.criticalActions.includes(entry.action)) {
      console.warn('Critical action performed:', {
        action: entry.action,
        performedBy: entry.performedBy.name,
        bookingId: entry.bookingId,
        timestamp: entry.timestamp
      });
    }
    
    // Verificar exportación masiva de datos
    if (entry.action === 'data_exported' && entry.metadata.recordCount > AuditConfig.alerts.massDataExport) {
      console.warn('Mass data export detected:', {
        recordCount: entry.metadata.recordCount,
        performedBy: entry.performedBy.name,
        timestamp: entry.timestamp
      });
    }
  }
  
  // Limpiar entradas antiguas
  async cleanupOldEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AuditConfig.retentionPeriod);
    
    let removedCount = 0;
    
    for (const [bookingId, entries] of this.entries.entries()) {
      const filteredEntries = entries.filter(entry => entry.timestamp > cutoffDate);
      removedCount += entries.length - filteredEntries.length;
      
      if (filteredEntries.length === 0) {
        this.entries.delete(bookingId);
      } else {
        this.entries.set(bookingId, filteredEntries);
      }
    }
    
    console.log(`Cleaned up ${removedCount} old audit entries`);
    return removedCount;
  }
  
  // Exportar datos de auditoría
  async exportAuditData(filter: AuditFilter): Promise<string> {
    const entries = await this.searchAuditEntries(filter, 10000);
    
    // Registrar la exportación
    await this.logAction({
      bookingId: 'system',
      action: 'data_exported',
      performedBy: {
        id: 'system',
        name: 'System',
        role: 'system'
      },
      changes: [], // No hay cambios de campos para exportación de datos
      metadata: {
        recordCount: entries.length,
        filter
      }
    });
    
    // Convertir a CSV
    const csvHeaders = [
      'ID', 'Booking ID', 'Action', 'Performed By', 'Role', 'Timestamp',
      'Changes', 'Reason', 'Notes', 'IP Address'
    ];
    
    const csvRows = entries.map(entry => [
      entry.id,
      entry.bookingId,
      entry.action,
      entry.performedBy.name,
      entry.performedBy.role,
      entry.timestamp.toISOString(),
      JSON.stringify(entry.changes),
      entry.reason || '',
      entry.notes || '',
      entry.ipAddress || ''
    ]);
    
    return [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Utilidades para auditoría
export class AuditUtils {
  // Detectar cambios entre dos objetos
  static detectChanges(oldObj: any, newObj: any, prefix = ''): AuditChange[] {
    const changes: AuditChange[] = [];
    
    // Obtener todas las claves únicas
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    for (const key of allKeys) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];
      
      if (oldValue !== newValue) {
        changes.push({
          field: fieldName,
          oldValue,
          newValue,
          fieldType: this.getFieldType(newValue)
        });
      }
    }
    
    return changes;
  }
  
  // Determinar el tipo de campo
  private static getFieldType(value: any): AuditChange['fieldType'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }
  
  // Formatear cambios para mostrar
  static formatChange(change: AuditChange): string {
    const { field, oldValue, newValue } = change;
    
    if (oldValue === null || oldValue === undefined) {
      return `${field}: establecido a "${newValue}"`;
    }
    
    if (newValue === null || newValue === undefined) {
      return `${field}: eliminado (era "${oldValue}")`;
    }
    
    return `${field}: cambiado de "${oldValue}" a "${newValue}"`;
  }
  
  // Obtener etiqueta de acción
  static getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      booking_created: 'Reserva creada',
      booking_updated: 'Reserva actualizada',
      booking_canceled: 'Reserva cancelada',
      booking_rescheduled: 'Reserva reprogramada',
      status_changed: 'Estado cambiado',
      payment_processed: 'Pago procesado',
      payment_refunded: 'Pago reembolsado',
      payment_disputed: 'Pago disputado',
      check_in: 'Check-in realizado',
      check_out: 'Check-out realizado',
      no_show_marked: 'Marcado como no show',
      notes_added: 'Notas agregadas',
      customer_contacted: 'Cliente contactado',
      dispute_resolved: 'Disputa resuelta',
      policy_override: 'Política anulada',
      data_exported: 'Datos exportados',
      data_deleted: 'Datos eliminados'
    };
    
    return labels[action] || action;
  }
  
  // Verificar si una acción es crítica
  static isCriticalAction(action: AuditAction): boolean {
    return AuditConfig.criticalActions.includes(action);
  }
  
  // Obtener color para la acción
  static getActionColor(action: AuditAction): string {
    if (this.isCriticalAction(action)) {
      return 'red';
    }
    
    const colors: Partial<Record<AuditAction, string>> = {
      booking_created: 'green',
      booking_updated: 'blue',
      status_changed: 'blue',
      payment_processed: 'green',
      check_in: 'green',
      check_out: 'green'
    };
    
    return colors[action] || 'gray';
  }
}

// Instancia global del servicio de auditoría
export const auditService = AuditService.getInstance();