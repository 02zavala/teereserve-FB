"use client";

import { useState, useEffect } from 'react';
import type { Booking, BookingStatus, GolfCourse } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, X, MoreHorizontal, Clock, Edit, UserCheck, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  cancellationPolicyService,
  CancellationValidators,
  type RefundCalculation,
} from '@/lib/cancellation-policies';
import { bookingEditService } from '@/lib/booking-edit-service';
import { BookingEditDialog } from './BookingEditDialog';

interface GuestBookingActionsProps {
  booking: Booking;
  course: GolfCourse;
  dictionary: any;
  onBookingUpdated?: (booking: Booking) => void;
}

export function GuestBookingActions({ booking, course, dictionary, onBookingUpdated }: GuestBookingActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refundCalculation, setRefundCalculation] = useState<RefundCalculation | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Calcular política de reembolso usando el nuevo sistema
  useEffect(() => {
    const bookingDate = new Date(booking.date);
    const calculation = cancellationPolicyService.calculateRefund(
      booking.courseId || 'default-course',
      bookingDate,
      booking.totalPrice,
      'customer_request'
    );
    setRefundCalculation(calculation);
  }, [booking]);

  // Verificar si la reserva está en el pasado
  const isPastBooking = () => {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    return bookingDate < now;
  };

  // Verificar si se puede cancelar usando el nuevo sistema
  const canCancel = () => {
    if (isPastBooking()) return false;
    if (!['confirmed', 'pending', 'rescheduled'].includes(booking.status)) return false;
    
    const bookingDate = new Date(booking.date);
    return CancellationValidators.canCancel(booking.status as BookingStatus, bookingDate);
  };

  // Verificar si se puede editar
  const canEdit = () => {
    if (isPastBooking()) return false;
    if (!['confirmed', 'rescheduled'].includes(booking.status)) return false;
    
    const now = new Date();
    const teeTime = new Date(booking.teeDateTime || booking.date);
    const hoursUntilTee = (teeTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Permitir edición hasta 6 horas antes (configurable por campo)
    return hoursUntilTee >= 6;
  };

  // Verificar si se puede transferir
  const canTransfer = () => {
    if (isPastBooking()) return false;
    if (!['confirmed', 'rescheduled'].includes(booking.status)) return false;
    
    const now = new Date();
    const teeTime = new Date(booking.teeDateTime || booking.date);
    const hoursUntilTee = (teeTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Permitir transferencia hasta 6 horas antes
    return hoursUntilTee >= 6;
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      // Aquí iría la lógica para cancelar la reserva
      // Por ahora solo mostramos un toast
      if (refundCalculation) {
        toast({
          title: "Solicitud de cancelación enviada",
          description: `Tu solicitud ha sido enviada. ${refundCalculation.description}`,
        });
      }
      
      setShowCancelDialog(false);
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

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un email válido.",
        variant: "destructive",
      });
      return;
    }

    setTransferLoading(true);
    try {
      const idempotencyKey = `transfer-${booking.id}-${Date.now()}`;
      const result = await bookingEditService.transferBooking(
        booking,
        course,
        transferEmail, // En producción, esto sería el ID del usuario
        booking.customerInfo?.email || booking.userId,
        idempotencyKey
      );

      if (result.success) {
        toast({
          title: "Transferencia exitosa",
          description: "La reserva ha sido transferida correctamente.",
        });
        setShowTransferDialog(false);
        setTransferEmail('');
      } else {
        toast({
          title: "Error en transferencia",
          description: result.error || "No se pudo transferir la reserva.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error interno del servidor.",
        variant: "destructive",
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleBookingUpdated = (updatedBooking: Booking) => {
    if (onBookingUpdated) {
      onBookingUpdated(updatedBooking);
    }
    toast({
      title: "Reserva actualizada",
      description: "Los cambios han sido aplicados exitosamente.",
    });
  };

  // Si no hay acciones disponibles, no mostrar el menú
  if (!canCancel() && !canEdit() && !canTransfer()) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Acciones
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit() && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Reserva
            </DropdownMenuItem>
          )}
          {canTransfer() && (
            <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Transferir Reserva
            </DropdownMenuItem>
          )}
          {(canEdit() || canTransfer()) && canCancel() && <DropdownMenuSeparator />}
          {canCancel() && (
            <DropdownMenuItem 
              onClick={() => setShowCancelDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar Reserva
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>¿Estás seguro de que quieres cancelar esta reserva?</p>
              {refundCalculation && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium text-sm">
                    Política de reembolso: {refundCalculation.description}
                  </p>
                  {refundCalculation.refundAmount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Recibirás ${refundCalculation.refundAmount.toFixed(2)} de reembolso
                    </p>
                  )}
                  {refundCalculation.fees.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Cargos aplicables: ${refundCalculation.fees.reduce((sum: number, fee: any) => sum + fee.amount, 0).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener reserva</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Procesando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de edición */}
      <BookingEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        booking={booking}
        course={course}
        onBookingUpdated={handleBookingUpdated}
      />

      {/* Diálogo de transferencia */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-email">Email del nuevo titular</Label>
              <Input
                id="transfer-email"
                type="email"
                placeholder="ejemplo@email.com"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
              />
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                • La transferencia tiene un costo de $99 MXN<br/>
                • Solo se puede transferir hasta 6 horas antes del tee time<br/>
                • El nuevo titular recibirá un email de confirmación
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowTransferDialog(false)}
                disabled={transferLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleTransfer}
                disabled={transferLoading || !transferEmail.trim()}
              >
                {transferLoading ? (
                  "Procesando..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Transferir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}