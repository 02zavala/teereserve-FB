"use client";

import { useState, useEffect } from 'react';
import type { Booking } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  Shield,
  FileText,
  Calendar,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import {
  paymentManager,
  PaymentUtils,
  type PaymentIntent,
  type PaymentSummary,
  type Refund,
  type RefundReason,
  type Dispute,
  type DisputeEvidence,
} from '@/lib/payment-management';

interface PaymentManagementDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdate?: (paymentData: any) => void;
}

export function PaymentManagementDialog({ booking, open, onOpenChange, onPaymentUpdate }: PaymentManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Estados para acciones
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState<RefundReason>('requested_by_customer');
  const [refundDescription, setRefundDescription] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<Partial<DisputeEvidence>>({});
  const { handleAsyncError } = useErrorHandler();

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadPaymentData();
    }
  }, [open, booking.id]);

  const loadPaymentData = async () => {
    setIsLoading(true);
    try {
      // Simular carga de datos de pago
      const [summary, intent] = await Promise.all([
        paymentManager.getPaymentSummary(booking.id),
        loadPaymentIntent(),
      ]);
      
      setPaymentSummary(summary);
      setPaymentIntent(intent);
      
      // Simular carga de reembolsos y disputas
      setRefunds([
        {
          id: 're_example_1',
          paymentIntentId: intent.id,
          amount: 25.00,
          reason: 'requested_by_customer',
          status: 'succeeded',
          description: 'Partial refund for cancellation',
          metadata: {},
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        },
      ]);
      
      setDisputes([]);
    } catch (error) {
      handleAsyncError(
        () => Promise.reject(error),
        { 
          defaultMessage: 'Failed to load payment data. Please try again.',
          onError: (err) => {
            console.error('Payment data loading error:', {
              error: err,
              bookingId: booking.id,
              timestamp: new Date().toISOString()
            });
          }
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentIntent = async (): Promise<PaymentIntent> => {
    // Simular PaymentIntent existente
    return {
      id: `pi_${booking.id}_payment`,
      amount: booking.totalPrice,
      currency: 'USD',
      status: 'succeeded',
      paymentMethodId: 'pm_card_visa',
      bookingId: booking.id,
      customerId: booking.userId,
      description: `Golf booking payment - ${booking.id}`,
      metadata: {
        bookingId: booking.id,
        courseName: 'Example Golf Course',
      },
      createdAt: new Date(booking.createdAt),
      authorizedAt: new Date(booking.createdAt),
      capturedAt: new Date(new Date(booking.createdAt).getTime() + 60 * 60 * 1000),
    };
  };

  const handleCapturePayment = async () => {
    if (!paymentIntent) {
      toast({
        title: "Error",
        description: "No payment intent available to capture.",
        variant: "destructive",
      });
      return;
    }
    
    if (paymentIntent.status !== 'requires_capture') {
      toast({
        title: "Error",
        description: "Payment is not in a state that can be captured.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const result = await handleAsyncError(async () => {
      const capturedIntent = await paymentManager.capturePayment(paymentIntent.id);
      setPaymentIntent(capturedIntent);
      
      toast({
        title: "Payment Captured",
        description: `Successfully captured payment of ${PaymentUtils.formatAmount(capturedIntent.amount)}.`,
      });
      
      if (onPaymentUpdate) {
        onPaymentUpdate({ type: 'capture', paymentIntent: capturedIntent });
      }
      
      return capturedIntent;
    }, {
      defaultMessage: 'Failed to capture payment. Please try again.',
      onError: (error) => {
        console.error('Payment capture error:', {
          error,
          paymentIntentId: paymentIntent.id,
          bookingId: booking.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setIsLoading(false);
  };

  const handleCancelAuthorization = async () => {
    if (!paymentIntent) {
      toast({
        title: "Error",
        description: "No payment intent available to cancel.",
        variant: "destructive",
      });
      return;
    }
    
    if (paymentIntent.status !== 'requires_capture') {
      toast({
        title: "Error",
        description: "Payment authorization cannot be canceled in its current state.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const result = await handleAsyncError(async () => {
      const canceledIntent = await paymentManager.cancelAuthorization(paymentIntent.id);
      setPaymentIntent(canceledIntent);
      
      toast({
        title: "Authorization Canceled",
        description: "Payment authorization has been successfully canceled.",
      });
      
      if (onPaymentUpdate) {
        onPaymentUpdate({ type: 'cancel_authorization', paymentIntent: canceledIntent });
      }
      
      return canceledIntent;
    }, {
      defaultMessage: 'Failed to cancel authorization. Please try again.',
      onError: (error) => {
        console.error('Authorization cancellation error:', {
          error,
          paymentIntentId: paymentIntent.id,
          bookingId: booking.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setIsLoading(false);
  };

  const handleCreateRefund = async () => {
    if (!paymentIntent) {
      toast({
        title: "Error",
        description: "Payment intent and refund amount are required.",
        variant: "destructive",
      });
      return;
    }
    
    const amount = refundAmount ? parseFloat(refundAmount) : undefined;
    
    // Validar monto
    if (amount && (isNaN(amount) || amount <= 0)) {
      throw new ValidationError('Refund amount must be a valid number greater than 0.');
    }
    
    if (amount && amount > paymentIntent.amount) {
      throw new ValidationError('Refund amount cannot exceed the payment amount.');
    }
    
    const maxRefundable = paymentIntent.amount - refunds.reduce((sum, r) => sum + r.amount, 0);
    if (amount && amount > maxRefundable) {
      throw new ValidationError(`Maximum refundable amount is ${PaymentUtils.formatAmount(maxRefundable)}.`);
    }
    
    setIsLoading(true);
    
    const result = await handleAsyncError(async () => {
      const refund = await paymentManager.createRefund({
        paymentIntentId: paymentIntent.id,
        amount,
        reason: refundReason,
        description: refundDescription || undefined,
        metadata: {
          bookingId: booking.id,
          processedBy: 'admin',
        },
      });
      
      setRefunds(prev => [refund, ...prev]);
      setRefundAmount('');
      setRefundDescription('');
      
      toast({
        title: "Refund Processed",
        description: `Successfully processed refund of ${PaymentUtils.formatAmount(refund.amount)}.`,
      });
      
      if (onPaymentUpdate) {
        onPaymentUpdate({ type: 'refund', refund });
      }
      
      return refund;
    }, {
      defaultMessage: 'Failed to process refund. Please try again.',
      onError: (error) => {
        console.error('Refund processing error:', {
          error,
          paymentIntentId: paymentIntent.id,
          amount,
          reason: refundReason,
          bookingId: booking.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setIsLoading(false);
  };

  const handleRespondToDispute = async (disputeId: string) => {
    if (!disputeId) {
      toast({
        title: "Error",
        description: "Dispute ID is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate required evidence fields
    if (!disputeEvidence.serviceDocumentation || disputeEvidence.serviceDocumentation.trim().length < 10) {
      throw new ValidationError('Dispute evidence must be at least 10 characters long.');
    }
    
    setIsLoading(true);
    
    const result = await handleAsyncError(async () => {
      const updatedDispute = await paymentManager.respondToDispute(disputeId, disputeEvidence);
      
      setDisputes(prev => prev.map(d => d.id === disputeId ? updatedDispute : d));
      setDisputeEvidence({});
      
      toast({
        title: "Response Submitted",
        description: "Dispute response has been submitted successfully.",
      });
      
      return updatedDispute;
    }, {
      defaultMessage: 'Failed to submit dispute response. Please try again.',
      onError: (error) => {
        console.error('Dispute response error:', {
          error,
          disputeId,
          evidence: disputeEvidence,
          bookingId: booking.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setIsLoading(false);
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'requires_capture':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'canceled':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const reasonLabels: Record<RefundReason, string> = {
    duplicate: 'Pago duplicado',
    fraudulent: 'Pago fraudulento',
    requested_by_customer: 'Solicitado por cliente',
    expired_uncaptured_charge: 'Autorización expirada',
    cancellation_policy: 'Política de cancelación',
    weather: 'Condiciones climáticas',
    maintenance: 'Mantenimiento',
    overbooking: 'Sobreventa',
  };

  if (isLoading && !paymentSummary) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando datos de pago...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gestión de Pagos - Reserva #{booking.id.substring(0, 7)}
          </DialogTitle>
          <DialogDescription>
            Administra pagos, reembolsos y disputas para esta reserva.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="payment">Pago</TabsTrigger>
            <TabsTrigger value="refunds">Reembolsos</TabsTrigger>
            <TabsTrigger value="disputes">Disputas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {paymentSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Capturado</p>
                        <p className="text-lg font-semibold text-green-600">
                          {PaymentUtils.formatAmount(paymentSummary.totalCaptured)}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Reembolsado</p>
                        <p className="text-lg font-semibold text-red-600">
                          {PaymentUtils.formatAmount(paymentSummary.totalRefunded)}
                        </p>
                      </div>
                      <RefreshCw className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">En Disputa</p>
                        <p className="text-lg font-semibold text-amber-600">
                          {PaymentUtils.formatAmount(paymentSummary.totalDisputed)}
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Monto Neto</p>
                        <p className="text-lg font-semibold">
                          {PaymentUtils.formatAmount(paymentSummary.netAmount)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {paymentIntent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Estado del Pago Principal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon(paymentIntent.status)}
                      <span className="font-medium">
                        {PaymentUtils.getStatusLabel(paymentIntent.status)}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {PaymentUtils.formatAmount(paymentIntent.amount)}
                    </Badge>
                  </div>
                  
                  {paymentIntent.status === 'requires_capture' && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Este pago está autorizado pero no capturado. Los fondos están reservados.
                        {paymentIntent.authorizationExpiresAt && (
                          <span className="block mt-1">
                            Expira: {paymentIntent.authorizationExpiresAt.toLocaleDateString()}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            {paymentIntent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detalles del Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID de Pago:</span>
                      <span className="ml-2 font-mono">{paymentIntent.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="ml-2 font-medium">{PaymentUtils.formatAmount(paymentIntent.amount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="ml-2">
                        <Badge variant="outline" className={`text-${PaymentUtils.getStatusColor(paymentIntent.status)}-600`}>
                          {PaymentUtils.getStatusLabel(paymentIntent.status)}
                        </Badge>
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Método:</span>
                      <span className="ml-2">**** 4242 (Visa)</span>
                    </div>
                    {paymentIntent.authorizedAt && (
                      <div>
                        <span className="text-muted-foreground">Autorizado:</span>
                        <span className="ml-2">{paymentIntent.authorizedAt.toLocaleString()}</span>
                      </div>
                    )}
                    {paymentIntent.capturedAt && (
                      <div>
                        <span className="text-muted-foreground">Capturado:</span>
                        <span className="ml-2">{paymentIntent.capturedAt.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    {paymentIntent.status === 'requires_capture' && (
                      <>
                        <Button onClick={handleCapturePayment} disabled={isLoading}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Capturar Pago
                        </Button>
                        <Button variant="outline" onClick={handleCancelAuthorization} disabled={isLoading}>
                          <X className="mr-2 h-4 w-4" />
                          Cancelar Autorización
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            {/* Crear nuevo reembolso */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Crear Reembolso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refundAmount">Monto (opcional - completo si vacío)</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={paymentIntent?.amount}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={`Máximo: ${PaymentUtils.formatAmount(paymentIntent?.amount || 0)}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refundReason">Motivo</Label>
                    <Select value={refundReason} onValueChange={(value) => setRefundReason(value as RefundReason)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(reasonLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="refundDescription">Descripción (opcional)</Label>
                  <Textarea
                    id="refundDescription"
                    value={refundDescription}
                    onChange={(e) => setRefundDescription(e.target.value)}
                    placeholder="Descripción del motivo del reembolso..."
                    rows={2}
                  />
                </div>
                
                <Button onClick={handleCreateRefund} disabled={isLoading || !paymentIntent}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Crear Reembolso
                </Button>
              </CardContent>
            </Card>

            {/* Lista de reembolsos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Historial de Reembolsos</CardTitle>
              </CardHeader>
              <CardContent>
                {refunds.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay reembolsos para esta reserva.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {refunds.map((refund) => (
                      <div key={refund.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-${PaymentUtils.getStatusColor(refund.status)}-600`}>
                              {PaymentUtils.getStatusLabel(refund.status)}
                            </Badge>
                            <span className="font-medium">{PaymentUtils.formatAmount(refund.amount)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {reasonLabels[refund.reason]} • {refund.createdAt.toLocaleDateString()}
                          </p>
                          {refund.description && (
                            <p className="text-sm text-muted-foreground">{refund.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>ID: {refund.id.substring(0, 12)}...</p>
                          {refund.processedAt && (
                            <p>Procesado: {refund.processedAt.toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Disputas Activas</CardTitle>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No hay disputas activas para esta reserva.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disputes.map((dispute) => (
                      <div key={dispute.id} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-${PaymentUtils.getStatusColor(dispute.status)}-600`}>
                              {PaymentUtils.getStatusLabel(dispute.status)}
                            </Badge>
                            <span className="font-medium">{PaymentUtils.formatAmount(dispute.amount)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {dispute.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          Motivo: {dispute.reason} • ID: {dispute.id}
                        </p>
                        
                        {dispute.evidenceDueBy && dispute.status === 'needs_response' && (
                          <Alert className="mb-3">
                            <Calendar className="h-4 w-4" />
                            <AlertDescription>
                              Respuesta requerida antes del: {dispute.evidenceDueBy.toLocaleDateString()}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {dispute.status === 'needs_response' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Evidencia de Servicio</Label>
                              <Textarea
                                value={disputeEvidence.serviceDocumentation || ''}
                                onChange={(e) => setDisputeEvidence(prev => ({ ...prev, serviceDocumentation: e.target.value }))}
                                placeholder="Describe el servicio proporcionado..."
                                rows={3}
                              />
                            </div>
                            
                            <Button 
                              onClick={() => handleRespondToDispute(dispute.id)}
                              disabled={isLoading}
                              size="sm"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Enviar Respuesta
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}