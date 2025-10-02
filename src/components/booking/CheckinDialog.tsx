'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, MapPin, CheckCircle, AlertTriangle, Loader2, Shield, Camera } from 'lucide-react';
import { GeolocationCheckin } from './GeolocationCheckin';
import { PhotoEvidence } from './PhotoEvidence';
import { evidenceSystem } from '@/lib/evidence-system';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { Booking, GolfCourse } from '@/types';
import type { CheckinEvidence } from '@/lib/evidence-system';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  course: GolfCourse;
  onCheckinComplete?: (booking: Booking) => void;
}

export function CheckinDialog({ 
  open, 
  onOpenChange, 
  booking, 
  course, 
  onCheckinComplete 
}: CheckinDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoEvidence, setPhotoEvidence] = useState<string | null>(null);
  const [checkinCompleted, setCheckinCompleted] = useState(false);

  // Verificar si el check-in ya fue realizado
  useEffect(() => {
    setCheckinCompleted(booking.status === 'checked_in');
  }, [booking.status]);

  // Verificar si la reserva es elegible para check-in
  const isEligibleForCheckin = () => {
    const now = new Date();
    const bookingDate = new Date(booking.date);
    const bookingTime = booking.time.split(':');
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(parseInt(bookingTime[0]), parseInt(bookingTime[1]));

    // Permitir check-in 2 horas antes y hasta 1 hora después
    const checkinWindowStart = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);
    const checkinWindowEnd = new Date(bookingDateTime.getTime() + 1 * 60 * 60 * 1000);

    return now >= checkinWindowStart && now <= checkinWindowEnd;
  };

  // Verificar si la reserva está confirmada
  const isBookingConfirmed = () => {
    return ['confirmed', 'rescheduled'].includes(booking.status);
  };

  // Manejar completación del check-in
  const handleCheckinComplete = async (evidenceData: CheckinEvidence) => {
    if (!user) {
      toast({
        title: "Error de autenticación",
        description: "Debes estar autenticado para hacer check-in.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Registrar evidencia del check-in
      const evidenceId = await evidenceSystem.recordCheckinEvidence(
        booking.id,
        user.uid,
        {
          ...evidenceData,
          photo: photoEvidence || undefined
        }
      );

      // Aquí deberías actualizar el estado de la reserva en la base de datos
      // Por ahora simularemos la actualización
      await updateBookingStatus(booking.id, 'checked_in', evidenceId);

      setCheckinCompleted(true);

      toast({
        title: "Check-in completado",
        description: "Tu check-in ha sido registrado exitosamente.",
      });

      // Notificar al componente padre
      if (onCheckinComplete) {
        onCheckinComplete({
          ...booking,
          status: 'checked_in'
        });
      }

      // Cerrar el diálogo después de un breve delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Error completing check-in:', error);
      toast({
        title: "Error en check-in",
        description: "Hubo un problema al completar el check-in. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Función simulada para actualizar el estado de la reserva
  const updateBookingStatus = async (bookingId: string, status: string, evidenceId: string) => {
    // En una implementación real, esto haría una llamada a la API
    // para actualizar el estado de la reserva en Firebase
    console.log('Updating booking status:', { bookingId, status, evidenceId });
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Formatear fecha y hora
  const formatBookingDateTime = () => {
    try {
      const bookingDate = new Date(booking.date);
      const formattedDate = format(bookingDate, 'EEEE, d MMMM yyyy', { locale: es });
      return `${formattedDate} a las ${booking.time}`;
    } catch (error) {
      return `${booking.date} a las ${booking.time}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-in de Reserva</DialogTitle>
          <DialogDescription>
            Completa tu check-in para confirmar tu llegada al campo de golf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la reserva */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">{course.name}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatBookingDateTime()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{booking.players} jugador(es)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{course.location.address}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {booking.status === 'confirmed' ? 'Confirmada' : 
                   booking.status === 'checked_in' ? 'Check-in realizado' :
                   booking.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Estado del check-in */}
          {checkinCompleted ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ Check-in completado exitosamente. ¡Disfruta tu ronda de golf!
              </AlertDescription>
            </Alert>
          ) : !isBookingConfirmed() ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta reserva debe estar confirmada para realizar el check-in.
              </AlertDescription>
            </Alert>
          ) : !isEligibleForCheckin() ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                El check-in solo está disponible 2 horas antes y hasta 1 hora después de tu hora de reserva.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Componente de check-in por geolocalización */}
              <GeolocationCheckin
                booking={booking}
                course={course}
                onCheckinComplete={handleCheckinComplete}
                onCancel={() => onOpenChange(false)}
              />
              
              {/* Componente de evidencia fotográfica */}
              <PhotoEvidence
                onPhotoCapture={setPhotoEvidence}
                onPhotoRemove={() => setPhotoEvidence(null)}
                capturedPhoto={photoEvidence || undefined}
                disabled={isProcessing || checkinCompleted}
              />
            </div>
          )}

          {/* Información adicional */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Importante:</strong> El check-in por geolocalización verifica tu presencia 
              en el campo de golf y sirve como evidencia en caso de disputas de pago.
            </p>
            <p>
              Tu ubicación y otros datos técnicos se registrarán de forma segura para 
              proteger tanto al cliente como al establecimiento.
            </p>
          </div>

          {/* Botones de acción */}
          {!checkinCompleted && (isBookingConfirmed() && isEligibleForCheckin()) && (
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}