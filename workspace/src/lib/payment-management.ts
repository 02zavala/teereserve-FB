"use client";

// Sistema de gestión de pagos para TeeReserve
// Incluye autorización vs captura, reembolsos y manejo de disputas

export interface PaymentMethod {
  id: string;
  type: 'stripe' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  customerId: string;
  createdAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  paymentMethodId: string;
  bookingId: string;
  customerId: string;
  description: string;
  metadata: Record<string, string>;
  createdAt: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  canceledAt?: Date;
  authorizationExpiresAt?: Date;
}

export type PaymentIntentStatus = 
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled';

export interface Refund {
  id: string;
  paymentIntentId: string;
  amount: number;
  reason: RefundReason;
  status: RefundStatus;
  description?: string;
  metadata: Record<string, string>;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

export type RefundReason = 
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'expired_uncaptured_charge'
  | 'cancellation_policy'
  | 'weather'
  | 'maintenance'
  | 'overbooking';

export type RefundStatus = 
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface Dispute {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  reason: DisputeReason;
  status: DisputeStatus;
  evidence?: DisputeEvidence;
  createdAt: Date;
  evidenceDueBy?: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
}

export type DisputeReason = 
  | 'credit_not_processed'
  | 'duplicate'
  | 'fraudulent'
  | 'general'
  | 'incorrect_account_details'
  | 'insufficient_funds'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'subscription_canceled'
  | 'unrecognized';

export type DisputeStatus = 
  | 'warning_needs_response'
  | 'warning_under_review'
  | 'warning_closed'
  | 'needs_response'
  | 'under_review'
  | 'charge_refunded'
  | 'won'
  | 'lost';

export interface DisputeEvidence {
  accessActivityLog?: string;
  billingAddress?: string;
  cancellationPolicy?: string;
  cancellationPolicyDisclosure?: string;
  cancellationRebuttal?: string;
  customerCommunication?: string;
  customerEmailAddress?: string;
  customerName?: string;
  customerPurchaseIp?: string;
  customerSignature?: string;
  duplicateChargeDocumentation?: string;
  duplicateChargeExplanation?: string;
  duplicateChargeId?: string;
  productDescription?: string;
  receipt?: string;
  refundPolicy?: string;
  refundPolicyDisclosure?: string;
  refundRefusalExplanation?: string;
  serviceDate?: string;
  serviceDocumentation?: string;
  shippingAddress?: string;
  shippingCarrier?: string;
  shippingDate?: string;
  shippingDocumentation?: string;
  shippingTrackingNumber?: string;
  uncategorizedFile?: string;
  uncategorizedText?: string;
}

export interface PaymentTransaction {
  id: string;
  type: 'authorization' | 'capture' | 'refund' | 'dispute';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  paymentIntentId: string;
  description: string;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

export interface PaymentSummary {
  totalAuthorized: number;
  totalCaptured: number;
  totalRefunded: number;
  totalDisputed: number;
  netAmount: number;
  pendingCaptures: number;
  pendingRefunds: number;
  activeDisputes: number;
}

// Configuración de políticas de pago
export interface PaymentPolicies {
  authorizationHoldDays: number; // Días que se mantiene la autorización
  autoCapture: boolean; // Captura automática después de la autorización
  autoCaptureDelay: number; // Minutos de delay para auto-captura
  refundProcessingDays: number; // Días para procesar reembolsos
  disputeResponseDays: number; // Días para responder disputas
  minimumRefundAmount: number; // Monto mínimo para reembolsos
  maximumRefundDays: number; // Días máximos para solicitar reembolso
}

const DEFAULT_PAYMENT_POLICIES: PaymentPolicies = {
  authorizationHoldDays: 7,
  autoCapture: false,
  autoCaptureDelay: 60, // 1 hora
  refundProcessingDays: 5,
  disputeResponseDays: 7,
  minimumRefundAmount: 1.00,
  maximumRefundDays: 180,
};

export class PaymentManager {
  private policies: PaymentPolicies;

  constructor(policies: Partial<PaymentPolicies> = {}) {
    this.policies = { ...DEFAULT_PAYMENT_POLICIES, ...policies };
  }

  // Crear intención de pago con autorización
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    paymentMethodId: string;
    bookingId: string;
    customerId: string;
    description: string;
    metadata?: Record<string, string>;
    captureMethod?: 'automatic' | 'manual';
  }): Promise<PaymentIntent> {
    const paymentIntent: PaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_confirmation',
      paymentMethodId: params.paymentMethodId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      description: params.description,
      metadata: params.metadata || {},
      createdAt: new Date(),
    };

    // Simular procesamiento
    await this.simulateProcessing(1000);

    // Autorizar el pago
    return this.authorizePayment(paymentIntent.id);
  }

  // Autorizar pago (reservar fondos)
  async authorizePayment(paymentIntentId: string): Promise<PaymentIntent> {
    await this.simulateProcessing(1500);

    const authorizationExpiresAt = new Date();
    authorizationExpiresAt.setDate(authorizationExpiresAt.getDate() + this.policies.authorizationHoldDays);

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: 150.00, // Ejemplo
      currency: 'USD',
      status: 'requires_capture',
      paymentMethodId: 'pm_example',
      bookingId: 'booking_example',
      customerId: 'cus_example',
      description: 'Golf booking payment',
      metadata: {},
      createdAt: new Date(),
      authorizedAt: new Date(),
      authorizationExpiresAt,
    };

    // Programar auto-captura si está habilitada
    if (this.policies.autoCapture) {
      setTimeout(() => {
        this.capturePayment(paymentIntentId);
      }, this.policies.autoCaptureDelay * 60 * 1000);
    }

    return paymentIntent;
  }

  // Capturar pago (cobrar fondos autorizados)
  async capturePayment(paymentIntentId: string, amount?: number): Promise<PaymentIntent> {
    await this.simulateProcessing(1200);

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: amount || 150.00,
      currency: 'USD',
      status: 'succeeded',
      paymentMethodId: 'pm_example',
      bookingId: 'booking_example',
      customerId: 'cus_example',
      description: 'Golf booking payment',
      metadata: {},
      createdAt: new Date(),
      authorizedAt: new Date(),
      capturedAt: new Date(),
    };

    return paymentIntent;
  }

  // Cancelar autorización
  async cancelAuthorization(paymentIntentId: string): Promise<PaymentIntent> {
    await this.simulateProcessing(800);

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: 150.00,
      currency: 'USD',
      status: 'canceled',
      paymentMethodId: 'pm_example',
      bookingId: 'booking_example',
      customerId: 'cus_example',
      description: 'Golf booking payment',
      metadata: {},
      createdAt: new Date(),
      authorizedAt: new Date(),
      canceledAt: new Date(),
    };

    return paymentIntent;
  }

  // Crear reembolso
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // Si no se especifica, reembolso completo
    reason: RefundReason;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Refund> {
    // Validar monto mínimo
    if (params.amount && params.amount < this.policies.minimumRefundAmount) {
      throw new Error(`Minimum refund amount is $${this.policies.minimumRefundAmount}`);
    }

    await this.simulateProcessing(1000);

    const refund: Refund = {
      id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount || 150.00, // Monto completo por defecto
      reason: params.reason,
      status: 'pending',
      description: params.description,
      metadata: params.metadata || {},
      createdAt: new Date(),
    };

    // Simular procesamiento del reembolso
    setTimeout(async () => {
      await this.processRefund(refund.id);
    }, 2000);

    return refund;
  }

  // Procesar reembolso
  private async processRefund(refundId: string): Promise<Refund> {
    await this.simulateProcessing(2000);

    const refund: Refund = {
      id: refundId,
      paymentIntentId: 'pi_example',
      amount: 150.00,
      reason: 'requested_by_customer',
      status: 'succeeded',
      metadata: {},
      createdAt: new Date(),
      processedAt: new Date(),
    };

    return refund;
  }

  // Obtener resumen de pagos
  async getPaymentSummary(bookingId: string): Promise<PaymentSummary> {
    await this.simulateProcessing(500);

    // En una implementación real, esto consultaría la base de datos
    const summary: PaymentSummary = {
      totalAuthorized: 150.00,
      totalCaptured: 150.00,
      totalRefunded: 0.00,
      totalDisputed: 0.00,
      netAmount: 150.00,
      pendingCaptures: 0,
      pendingRefunds: 0,
      activeDisputes: 0,
    };

    return summary;
  }

  // Manejar disputa
  async handleDispute(params: {
    paymentIntentId: string;
    reason: DisputeReason;
    amount: number;
    evidence?: Partial<DisputeEvidence>;
  }): Promise<Dispute> {
    await this.simulateProcessing(1000);

    const evidenceDueBy = new Date();
    evidenceDueBy.setDate(evidenceDueBy.getDate() + this.policies.disputeResponseDays);

    const dispute: Dispute = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount,
      currency: 'USD',
      reason: params.reason,
      status: 'needs_response',
      evidence: params.evidence,
      createdAt: new Date(),
      evidenceDueBy,
    };

    return dispute;
  }

  // Responder a disputa
  async respondToDispute(disputeId: string, evidence: Partial<DisputeEvidence>): Promise<Dispute> {
    await this.simulateProcessing(1500);

    const dispute: Dispute = {
      id: disputeId,
      paymentIntentId: 'pi_example',
      amount: 150.00,
      currency: 'USD',
      reason: 'unrecognized',
      status: 'under_review',
      evidence,
      createdAt: new Date(),
      respondedAt: new Date(),
    };

    return dispute;
  }

  // Validar si se puede hacer reembolso
  canRefund(paymentIntent: PaymentIntent, requestedAmount?: number): {
    canRefund: boolean;
    reason?: string;
    maxRefundAmount?: number;
  } {
    if (paymentIntent.status !== 'succeeded') {
      return {
        canRefund: false,
        reason: 'Payment must be captured before refunding',
      };
    }

    const daysSinceCapture = paymentIntent.capturedAt 
      ? Math.floor((Date.now() - paymentIntent.capturedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceCapture > this.policies.maximumRefundDays) {
      return {
        canRefund: false,
        reason: `Refund period expired (${this.policies.maximumRefundDays} days)`,
      };
    }

    const maxRefundAmount = paymentIntent.amount; // En una implementación real, restar reembolsos previos

    if (requestedAmount && requestedAmount > maxRefundAmount) {
      return {
        canRefund: false,
        reason: 'Requested amount exceeds available refund amount',
        maxRefundAmount,
      };
    }

    if (requestedAmount && requestedAmount < this.policies.minimumRefundAmount) {
      return {
        canRefund: false,
        reason: `Minimum refund amount is $${this.policies.minimumRefundAmount}`,
      };
    }

    return {
      canRefund: true,
      maxRefundAmount,
    };
  }

  // Verificar si la autorización está por expirar
  isAuthorizationExpiring(paymentIntent: PaymentIntent, warningDays: number = 1): boolean {
    if (!paymentIntent.authorizationExpiresAt || paymentIntent.status !== 'requires_capture') {
      return false;
    }

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    return paymentIntent.authorizationExpiresAt <= warningDate;
  }

  // Simular procesamiento asíncrono
  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener políticas actuales
  getPolicies(): PaymentPolicies {
    return { ...this.policies };
  }

  // Actualizar políticas
  updatePolicies(newPolicies: Partial<PaymentPolicies>): void {
    this.policies = { ...this.policies, ...newPolicies };
  }
}

// Instancia singleton del gestor de pagos
export const paymentManager = new PaymentManager();

// Utilidades para formateo
export const PaymentUtils = {
  formatAmount: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  getStatusColor: (status: PaymentIntentStatus | RefundStatus | DisputeStatus): string => {
    const colorMap: Record<string, string> = {
      // Payment Intent Status
      'requires_payment_method': 'gray',
      'requires_confirmation': 'yellow',
      'requires_action': 'orange',
      'processing': 'blue',
      'requires_capture': 'purple',
      'succeeded': 'green',
      'canceled': 'red',
      
      // Refund Status
      'pending': 'yellow',
      'failed': 'red',
      
      // Dispute Status
      'warning_needs_response': 'orange',
      'warning_under_review': 'yellow',
      'warning_closed': 'gray',
      'needs_response': 'red',
      'under_review': 'blue',
      'charge_refunded': 'green',
      'won': 'green',
      'lost': 'red',
    };
    
    return colorMap[status] || 'gray';
  },

  getStatusLabel: (status: PaymentIntentStatus | RefundStatus | DisputeStatus): string => {
    const labelMap: Record<string, string> = {
      // Payment Intent Status
      'requires_payment_method': 'Requiere método de pago',
      'requires_confirmation': 'Requiere confirmación',
      'requires_action': 'Requiere acción',
      'processing': 'Procesando',
      'requires_capture': 'Autorizado - Pendiente captura',
      'succeeded': 'Completado',
      'canceled': 'Cancelado',
      
      // Refund Status
      'pending': 'Reembolso pendiente',
      'refund_succeeded': 'Reembolsado',
      'failed': 'Reembolso fallido',
      
      // Dispute Status
      'warning_needs_response': 'Advertencia - Requiere respuesta',
      'warning_under_review': 'Advertencia - En revisión',
      'warning_closed': 'Advertencia - Cerrada',
      'needs_response': 'Disputa - Requiere respuesta',
      'under_review': 'Disputa - En revisión',
      'charge_refunded': 'Disputa - Reembolsado',
      'won': 'Disputa - Ganada',
      'lost': 'Disputa - Perdida',
    };
    
    return labelMap[status] || status;
  },
};