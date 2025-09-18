"use client";

import { useState, Fragment } from 'react';
import { MoreHorizontal, Edit, X, Calendar, CheckCircle, Clock, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import type { Booking, BookingStatus } from '@/types';
import { BookingEditDialog } from './BookingEditDialog';
import { CancellationDialog } from './CancellationDialog';
import { RescheduleDialog } from './RescheduleDialog';
import { PaymentManagementDialog } from './PaymentManagementDialog';
import { AuditHistoryDialog } from './AuditHistoryDialog';
import type { CancellationRequest, RefundCalculation } from '@/lib/cancellation-policies';

interface BookingActionsMenuProps {
  booking: Booking;
  onStatusChange?: (bookingId: string, newStatus: BookingStatus, reason?: string) => void;
  onEdit?: (booking: Booking) => void;
  isAdmin?: boolean;
}

export function BookingActionsMenu({ 
  booking, 
  onStatusChange, 
  onEdit, 
  isAdmin = false 
}: BookingActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  const handleStatusChange = async (newStatus: BookingStatus, reason?: string) => {
    if (!onStatusChange) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(booking.id, newStatus, reason);
      toast({
        title: "Estado actualizado",
        description: `La reserva ha sido marcada como ${getStatusLabel(newStatus)}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la reserva.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (editedBooking: Booking) => {
    console.log('Saving edited booking:', editedBooking);
    
    toast({
      title: "Reserva actualizada",
      description: "Los cambios han sido guardados exitosamente.",
    });
    
    setShowEditDialog(false);
  };

  const handleCancellation = async (cancellationRequest: CancellationRequest, refundCalculation: RefundCalculation) => {
    console.log('Processing cancellation:', cancellationRequest, refundCalculation);
    
    await handleStatusChange('canceled_admin', cancellationRequest.reason);
    
    setShowCancellationDialog(false);
  };

  const handleReschedule = async (rescheduleData: any) => {
    console.log('Processing reschedule:', rescheduleData);
    
    await handleStatusChange('rescheduled', rescheduleData.rescheduleReason);
    
    setShowRescheduleDialog(false);
  };

  const handlePaymentUpdate = async (paymentData: any) => {
    console.log('Payment updated:', paymentData);
    
    if (paymentData.type === 'capture') {
      await handleStatusChange('confirmed', 'Payment captured');
    }
    
    toast({
      title: "Pago actualizado",
      description: "Los datos de pago han sido actualizados correctamente.",
    });
  };

  const getStatusLabel = (status: BookingStatus): string => {
    const labels: Record<BookingStatus, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      rescheduled: 'Reprogramada',
      checked_in: 'Check-in realizado',
      completed: 'Completada',
      canceled_customer: 'Cancelada por cliente',
      canceled_admin: 'Cancelada por admin',
      no_show: 'No se presentó',
      disputed: 'En disputa'
    };
    return labels[status] || status;
  };

  const canTransitionTo = (currentStatus: BookingStatus, targetStatus: BookingStatus): boolean => {
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'canceled_admin', 'canceled_customer'],
      confirmed: ['rescheduled', 'checked_in', 'canceled_admin', 'canceled_customer', 'no_show'],
      rescheduled: ['confirmed', 'checked_in', 'canceled_admin', 'canceled_customer', 'no_show'],
      checked_in: ['completed', 'no_show'],
      completed: ['disputed'],
      canceled_customer: [],
      canceled_admin: [],
      no_show: [],
      disputed: ['completed']
    };
    
    return transitions[currentStatus]?.includes(targetStatus) || false;
  };

  const isBookingInPast = () => {
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    return bookingDateTime < new Date();
  };

  const canEdit = () => {
    if (isBookingInPast() && !['confirmed', 'rescheduled', 'checked_in'].includes(booking.status)) {
      return false;
    }
    return !['canceled_customer', 'canceled_admin', 'completed', 'disputed'].includes(booking.status);
  };

  return (
    <Fragment>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            aria-haspopup="true" 
            size="icon" 
            variant="ghost"
            disabled={isLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menú de acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span>Acciones</span>
            <Badge variant="outline" className="text-xs">
              {getStatusLabel(booking.status)}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Editar reserva */}
          {canEdit() && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Reserva
            </DropdownMenuItem>
          )}
          
          {/* Transiciones de estado */}
          {canTransitionTo(booking.status, 'confirmed') && (
            <DropdownMenuItem onClick={() => handleStatusChange('confirmed')}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Confirmar
            </DropdownMenuItem>
          )}
          
          {canTransitionTo(booking.status, 'checked_in') && (
            <DropdownMenuItem onClick={() => handleStatusChange('checked_in')}>
              <Clock className="mr-2 h-4 w-4 text-blue-600" />
              Marcar Check-in
            </DropdownMenuItem>
          )}
          
          {canTransitionTo(booking.status, 'completed') && (
            <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Marcar Completada
            </DropdownMenuItem>
          )}
          
          {canTransitionTo(booking.status, 'no_show') && (
            <DropdownMenuItem onClick={() => handleStatusChange('no_show', 'Cliente no se presentó')}>
              <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
              Marcar No Show
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Reprogramar */}
          {canTransitionTo(booking.status, 'rescheduled') && (
            <DropdownMenuItem onClick={() => setShowRescheduleDialog(true)}>
              <Calendar className="mr-2 h-4 w-4 text-blue-600" />
              Reprogramar
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowPaymentDialog(true)}>
            <DollarSign className="mr-2 h-4 w-4" />
            Gestionar Pago
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowAuditDialog(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Historial de Auditoría
          </DropdownMenuItem>
          
          {/* Cancelaciones */}
          {(canTransitionTo(booking.status, 'canceled_admin') || canTransitionTo(booking.status, 'canceled_customer')) && (
            <Fragment>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowCancellationDialog(true)}
                className="text-red-600"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar reserva
              </DropdownMenuItem>
            </Fragment>
          )}
          
          {/* Gestión de disputas para admin */}
          {isAdmin && canTransitionTo(booking.status, 'disputed') && (
            <Fragment>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange('disputed', 'Disputa iniciada')}>
                <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                Marcar en Disputa
              </DropdownMenuItem>
            </Fragment>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Dialog de edición */}
      <BookingEditDialog
        booking={booking}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveEdit}
      />
      
      {/* Dialog de cancelación */}
      <CancellationDialog
        booking={booking}
        open={showCancellationDialog}
        onOpenChange={setShowCancellationDialog}
        onConfirm={handleCancellation}
      />
      
      {/* Dialog de reprogramación */}
      <RescheduleDialog
        booking={booking}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        onConfirm={handleReschedule}
      />
      
      <PaymentManagementDialog
        booking={booking}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onPaymentUpdate={handlePaymentUpdate}
      />
      
      <AuditHistoryDialog
        booking={booking}
        open={showAuditDialog}
        onOpenChange={setShowAuditDialog}
      />
    </Fragment>
  );
}