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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, DollarSign, Clock, FileText, X, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  cancellationPolicyService,
  type CancellationRequest,
  type RefundCalculation,
  CancellationValidators,
} from '@/lib/cancellation-policies';

interface CancellationDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (cancellationRequest: CancellationRequest, refundCalculation: RefundCalculation) => void;
}

export function CancellationDialog({ booking, open, onOpenChange, onConfirm }: CancellationDialogProps) {
  const [reason, setReason] = useState<CancellationRequest['reason']>('customer_request');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminOverride, setAdminOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refundCalculation, setRefundCalculation] = useState<RefundCalculation | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setReason('customer_request');
      setAdminNotes('');
      setAdminOverride(false);
      setShowConfirmation(false);
      calculateRefund('customer_request');
    }
  }, [open]);

  // Recalculate refund when reason changes
  useEffect(() => {
    if (open) {
      calculateRefund(reason);
    }
  }, [reason, open]);

  const calculateRefund = (cancellationReason: CancellationRequest['reason']) => {
    const bookingDate = new Date(booking.date);
    const calculation = cancellationPolicyService.calculateRefund(
      booking.courseId || 'default-course',
      bookingDate,
      booking.totalPrice,
      cancellationReason
    );
    setRefundCalculation(calculation);
  };

  const canCancel = () => {
    return CancellationValidators.canCancel(booking.status, new Date(booking.date));
  };

  const handleCancel = async () => {
    if (!refundCalculation) return;

    setIsLoading(true);
    try {
      const cancellationRequest: CancellationRequest = {
        bookingId: booking.id,
        reason,
        adminOverride,
        adminNotes: adminNotes || undefined,
        requestedBy: 'current-admin', // En una implementación real, obtener del contexto de usuario
        requestedAt: new Date(),
      };

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onConfirm) {
        onConfirm(cancellationRequest, refundCalculation);
      }

      toast({
        title: "Cancelación procesada",
        description: `La reserva ha sido cancelada. ${refundCalculation.netRefund > 0 ? `Reembolso: $${refundCalculation.netRefund.toFixed(2)}` : 'Sin reembolso.'}`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la cancelación. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reasonLabels: Record<CancellationRequest['reason'], string> = {
    customer_request: 'Solicitud del cliente',
    weather: 'Condiciones climáticas',
    maintenance: 'Mantenimiento del campo',
    overbooking: 'Sobreventa / Error de inventario',
    course_closure: 'Cierre del campo',
    other: 'Otro motivo',
  };

  const getReasonDescription = (reason: CancellationRequest['reason']): string => {
    const descriptions: Record<CancellationRequest['reason'], string> = {
      customer_request: 'El cliente solicita cancelar su reserva',
      weather: 'Condiciones climáticas adversas que impiden el juego',
      maintenance: 'Trabajos de mantenimiento programados o de emergencia',
      overbooking: 'Error en el sistema de reservas o sobreventa',
      course_closure: 'Cierre temporal o permanente del campo',
      other: 'Otro motivo no especificado',
    };
    return descriptions[reason];
  };

  if (!canCancel()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              No se puede cancelar
            </DialogTitle>
            <DialogDescription>
              Esta reserva no puede ser cancelada debido a su estado actual o porque ya ha pasado la fecha.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancelar Reserva #{booking.id.substring(0, 7)}</DialogTitle>
          <DialogDescription>
            Selecciona el motivo de cancelación para calcular el reembolso correspondiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la reserva */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalles de la Reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="ml-2 font-medium">{booking.userName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="ml-2 font-medium">{new Date(booking.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hora:</span>
                  <span className="ml-2 font-medium">{booking.time}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">${booking.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motivo de cancelación */}
          <div className="space-y-3">
            <Label htmlFor="reason">Motivo de cancelación</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as CancellationRequest['reason'])}>
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
            <p className="text-sm text-muted-foreground">
              {getReasonDescription(reason)}
            </p>
          </div>

          {/* Cálculo de reembolso */}
          {refundCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cálculo de Reembolso
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {refundCalculation.hoursUntilBooking} horas hasta la reserva
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monto original:</span>
                    <span>${refundCalculation.originalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Porcentaje de reembolso:</span>
                    <span>{refundCalculation.refundPercent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reembolso bruto:</span>
                    <span>${refundCalculation.refundAmount.toFixed(2)}</span>
                  </div>
                  {refundCalculation.fixedFee > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Tarifa de procesamiento:</span>
                      <span>-${refundCalculation.fixedFee.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Reembolso neto:</span>
                    <span className={refundCalculation.netRefund > 0 ? 'text-green-600' : 'text-red-600'}>
                      ${refundCalculation.netRefund.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium">{refundCalculation.policy.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas administrativas */}
          <div className="space-y-3">
            <Label htmlFor="adminNotes">Notas administrativas (opcional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Agregar notas internas sobre esta cancelación..."
              rows={3}
            />
          </div>

          {/* Override administrativo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="adminOverride"
              checked={adminOverride}
              onCheckedChange={(checked) => setAdminOverride(checked as boolean)}
            />
            <Label htmlFor="adminOverride" className="text-sm">
              Override administrativo (ignorar políticas estándar)
            </Label>
          </div>

          {adminOverride && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    El override administrativo requiere justificación en las notas.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {refundCalculation && refundCalculation.netRefund > 0 && (
              <Badge variant="outline" className="text-green-600">
                Reembolso: ${refundCalculation.netRefund.toFixed(2)}
              </Badge>
            )}
            {refundCalculation && refundCalculation.netRefund === 0 && (
              <Badge variant="outline" className="text-red-600">
                Sin reembolso
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleCancel} 
              disabled={isLoading || (adminOverride && !adminNotes.trim())}
              variant="destructive"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isLoading ? 'Procesando...' : 'Confirmar Cancelación'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}