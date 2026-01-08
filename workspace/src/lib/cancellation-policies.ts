import type { BookingStatus, PaymentStatus } from '@/types';

export interface CancellationPolicy {
  id: string;
  courseId: string;
  hoursBeforeMin: number; // Horas mínimas antes de la reserva
  hoursBeforeMax?: number; // Horas máximas (opcional para el último rango)
  refundPercent: number; // Porcentaje de reembolso (0-100)
  fixedFee?: number; // Tarifa fija de cancelación
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundCalculation {
  originalAmount: number;
  refundPercent: number;
  refundAmount: number;
  fixedFee: number;
  netRefund: number;
  policy: CancellationPolicy;
  hoursUntilBooking: number;
  description: string;
  fees: Array<{ name: string; amount: number; }>;
}

export interface CancellationRequest {
  bookingId: string;
  reason: 'customer_request' | 'weather' | 'maintenance' | 'overbooking' | 'course_closure' | 'other';
  adminOverride?: boolean;
  adminNotes?: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface CancellationResult {
  success: boolean;
  refundCalculation: RefundCalculation;
  transactionId?: string;
  error?: string;
  requiresManualReview?: boolean;
}

// Políticas por defecto para campos de golf
export const DEFAULT_CANCELLATION_POLICIES: Omit<CancellationPolicy, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>[] = [
  {
    hoursBeforeMin: 48,
    refundPercent: 100,
    fixedFee: 0,
    description: 'Cancelación con 48+ horas de anticipación - Reembolso completo',
    isActive: true,
  },
  {
    hoursBeforeMin: 24,
    hoursBeforeMax: 48,
    refundPercent: 50,
    fixedFee: 0,
    description: 'Cancelación entre 24-48 horas - Reembolso del 50%',
    isActive: true,
  },
  {
    hoursBeforeMin: 0,
    hoursBeforeMax: 24,
    refundPercent: 0,
    fixedFee: 10,
    description: 'Cancelación con menos de 24 horas - Sin reembolso + tarifa de procesamiento',
    isActive: true,
  },
];

// Excepciones por clima/cierre del campo
export const WEATHER_OVERRIDE_POLICY: Partial<CancellationPolicy> = {
  refundPercent: 100,
  fixedFee: 0,
  description: 'Cancelación por condiciones climáticas - Reembolso completo',
};

export class CancellationPolicyService {
  private policies: Map<string, CancellationPolicy[]> = new Map();

  constructor() {
    // Inicializar con políticas por defecto
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    // Simular políticas para un campo de ejemplo
    const defaultCourseId = 'default-course';
    const policies = DEFAULT_CANCELLATION_POLICIES.map((policy, index) => ({
      ...policy,
      id: `policy-${index + 1}`,
      courseId: defaultCourseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    this.policies.set(defaultCourseId, policies);
  }

  /**
   * Obtiene las políticas de cancelación para un campo específico
   */
  getPoliciesForCourse(courseId: string): CancellationPolicy[] {
    return this.policies.get(courseId) || this.policies.get('default-course') || [];
  }

  /**
   * Calcula el reembolso basado en las políticas y el tiempo hasta la reserva
   */
  calculateRefund(
    courseId: string,
    bookingDate: Date,
    totalAmount: number,
    cancellationReason?: CancellationRequest['reason']
  ): RefundCalculation {
    const now = new Date();
    const hoursUntilBooking = Math.floor(
      (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    // Verificar si es una excepción por clima/cierre
    if (this.isWeatherException(cancellationReason)) {
      return {
        originalAmount: totalAmount,
        refundPercent: 100,
        refundAmount: totalAmount,
        fixedFee: 0,
        netRefund: totalAmount,
        policy: {
          ...WEATHER_OVERRIDE_POLICY,
          id: 'weather-override',
          courseId,
          hoursBeforeMin: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CancellationPolicy,
        hoursUntilBooking,
        description: WEATHER_OVERRIDE_POLICY.description || 'Cancelación por condiciones climáticas - Reembolso completo',
        fees: [],
      };
    }

    const policies = this.getPoliciesForCourse(courseId)
      .filter(p => p.isActive)
      .sort((a, b) => b.hoursBeforeMin - a.hoursBeforeMin);

    // Encontrar la política aplicable
    const applicablePolicy = policies.find(policy => {
      if (policy.hoursBeforeMax) {
        return hoursUntilBooking >= policy.hoursBeforeMin && hoursUntilBooking < policy.hoursBeforeMax;
      } else {
        return hoursUntilBooking >= policy.hoursBeforeMin;
      }
    });

    if (!applicablePolicy) {
      // Si no hay política aplicable, usar la más restrictiva
      const mostRestrictive = policies[policies.length - 1];
      if (mostRestrictive) {
        return this.calculateRefundAmount(totalAmount, mostRestrictive, hoursUntilBooking);
      }
      
      // Fallback: sin reembolso
      return {
        originalAmount: totalAmount,
        refundPercent: 0,
        refundAmount: 0,
        fixedFee: 0,
        netRefund: 0,
        policy: policies[0] || {} as CancellationPolicy,
        hoursUntilBooking,
        description: 'Sin política de cancelación aplicable - Sin reembolso',
        fees: [],
      };
    }

    return this.calculateRefundAmount(totalAmount, applicablePolicy, hoursUntilBooking);
  }

  private calculateRefundAmount(
    totalAmount: number,
    policy: CancellationPolicy,
    hoursUntilBooking: number
  ): RefundCalculation {
    const refundAmount = (totalAmount * policy.refundPercent) / 100;
    const fixedFee = policy.fixedFee || 0;
    const netRefund = Math.max(0, refundAmount - fixedFee);

    const fees: Array<{ name: string; amount: number; }> = [];
    if (fixedFee > 0) {
      fees.push({ name: 'Tarifa de procesamiento', amount: fixedFee });
    }

    return {
      originalAmount: totalAmount,
      refundPercent: policy.refundPercent,
      refundAmount,
      fixedFee,
      netRefund,
      policy,
      hoursUntilBooking,
      description: policy.description,
      fees,
    };
  }

  private isWeatherException(reason?: CancellationRequest['reason']): boolean {
    return reason === 'weather' || reason === 'course_closure';
  }

  /**
   * Procesa una cancelación completa
   */
  async processCancellation(
    bookingId: string,
    courseId: string,
    bookingDate: Date,
    totalAmount: number,
    paymentStatus: PaymentStatus,
    cancellationRequest: CancellationRequest
  ): Promise<CancellationResult> {
    try {
      const refundCalculation = this.calculateRefund(
        courseId,
        bookingDate,
        totalAmount,
        cancellationRequest.reason
      );

      // Verificar si requiere revisión manual
      const requiresManualReview = this.requiresManualReview(
        refundCalculation,
        paymentStatus,
        cancellationRequest
      );

      if (requiresManualReview) {
        return {
          success: false,
          refundCalculation,
          requiresManualReview: true,
          error: 'Esta cancelación requiere revisión manual del equipo administrativo.',
        };
      }

      // Simular procesamiento del reembolso
      const transactionId = await this.processRefund(
        bookingId,
        refundCalculation.netRefund,
        paymentStatus
      );

      return {
        success: true,
        refundCalculation,
        transactionId,
      };
    } catch (error) {
      return {
        success: false,
        refundCalculation: this.calculateRefund(courseId, bookingDate, totalAmount),
        error: error instanceof Error ? error.message : 'Error desconocido al procesar la cancelación',
      };
    }
  }

  private requiresManualReview(
    refundCalculation: RefundCalculation,
    paymentStatus: PaymentStatus,
    cancellationRequest: CancellationRequest
  ): boolean {
    // Casos que requieren revisión manual:
    // 1. Reembolsos grandes (>$500)
    // 2. Disputas activas
    // 3. Cancelaciones repetidas del mismo usuario
    // 4. Override administrativo sin autorización
    
    if (refundCalculation.netRefund > 500) return true;
    if (paymentStatus === 'disputed') return true;
    if (cancellationRequest.adminOverride && !cancellationRequest.adminNotes) return true;
    
    return false;
  }

  private async processRefund(
    bookingId: string,
    refundAmount: number,
    paymentStatus: PaymentStatus
  ): Promise<string> {
    // Simular procesamiento del reembolso
    // En una implementación real, aquí se integraría con Stripe/PayPal
    
    if (refundAmount <= 0) {
      return 'no-refund-required';
    }

    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generar ID de transacción simulado
    const transactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return transactionId;
  }

  /**
   * Obtiene el resumen de políticas para mostrar al usuario
   */
  getPolicySummary(courseId: string): string[] {
    const policies = this.getPoliciesForCourse(courseId)
      .filter(p => p.isActive)
      .sort((a, b) => b.hoursBeforeMin - a.hoursBeforeMin);

    return policies.map(policy => {
      if (policy.hoursBeforeMax) {
        return `${policy.hoursBeforeMin}-${policy.hoursBeforeMax}h antes: ${policy.refundPercent}% reembolso${policy.fixedFee ? ` (tarifa: $${policy.fixedFee})` : ''}`;
      } else {
        return `${policy.hoursBeforeMin}h+ antes: ${policy.refundPercent}% reembolso${policy.fixedFee ? ` (tarifa: $${policy.fixedFee})` : ''}`;
      }
    });
  }
}

// Instancia singleton del servicio
export const cancellationPolicyService = new CancellationPolicyService();

// Utilidades para validación
export const CancellationValidators = {
  canCancel: (bookingStatus: BookingStatus, bookingDate: Date): boolean => {
    const now = new Date();
    const isPast = bookingDate < now;
    
    // No se puede cancelar reservas pasadas (excepto para marcar no-show)
    if (isPast) return false;
    
    // Estados que permiten cancelación
    const cancellableStatuses: BookingStatus[] = ['pending', 'confirmed', 'rescheduled'];
    return cancellableStatuses.includes(bookingStatus);
  },

  canReschedule: (bookingStatus: BookingStatus, bookingDate: Date): boolean => {
    const now = new Date();
    const isPast = bookingDate < now;
    
    if (isPast) return false;
    
    // Estados que permiten reprogramación
    const reschedulableStatuses: BookingStatus[] = ['pending', 'confirmed'];
    return reschedulableStatuses.includes(bookingStatus);
  },

  validateCancellationReason: (reason: CancellationRequest['reason']): boolean => {
    const validReasons: CancellationRequest['reason'][] = [
      'customer_request',
      'weather',
      'maintenance',
      'overbooking',
      'course_closure',
      'other'
    ];
    return validReasons.includes(reason);
  },
};