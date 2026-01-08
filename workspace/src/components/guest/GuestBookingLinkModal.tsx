'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/auth-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GuestBooking {
  id: string;
  guestEmail: string;
  guestName: string;
  date: string;
  time: string;
  course: string;
  players: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

interface GuestBookingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestEmail: string;
  lang: string;
}

export function GuestBookingLinkModal({
  isOpen,
  onClose,
  guestEmail,
  lang
}: GuestBookingLinkModalProps) {
  const [guestBookings, setGuestBookings] = useState<GuestBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);
  const { user } = useAuth();
  const { linkGuestBookings } = useGuestAuth();
  const { toast } = useToast();

  // Fetch guest bookings when modal opens
  useEffect(() => {
    if (isOpen && guestEmail && user && !user.isAnonymous) {
      fetchGuestBookings();
    }
  }, [isOpen, guestEmail, user]);

  const fetchGuestBookings = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/link-guest-bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestEmail })
      });

      if (!response.ok) {
        throw new Error('Error al obtener las reservas');
      }

      const data = await response.json();
      setGuestBookings(data.bookings || []);
    } catch (error: any) {
      console.error('Error fetching guest bookings:', error);
      setError('No se pudieron cargar las reservas de invitado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkBookings = async () => {
    if (!user || user.isAnonymous || guestBookings.length === 0) {
      return;
    }

    setIsLinking(true);
    setError('');

    try {
      const result = await linkGuestBookings(
        guestEmail, // This will be used as guestUserId
        user?.uid || '', // authenticatedUserId
        guestBookings.map(b => b.id) // bookingIds
      );

      if (result.linkedBookings !== undefined) {
        setSuccess(true);
        setLinkedCount(result.linkedBookings);
        toast({
          title: '¡Reservas vinculadas exitosamente!',
          description: `Se han vinculado ${result.linkedBookings} reserva(s) a tu cuenta.`,
        });
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error('Error al vincular las reservas');
      }
    } catch (error: any) {
      console.error('Error linking guest bookings:', error);
      const friendlyMessage = getFriendlyErrorMessage(error.code || error.message);
      setError(friendlyMessage);
      
      toast({
        title: 'Error al vincular reservas',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              ¡Reservas Vinculadas!
            </DialogTitle>
            <DialogDescription>
              Se vincularon {linkedCount} reservas a tu cuenta exitosamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Reservas de Invitado</DialogTitle>
          <DialogDescription>
            Encontramos reservas realizadas con el email {guestEmail}. ¿Te gustaría vincularlas a tu cuenta?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cargando reservas...</span>
            </div>
          ) : guestBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron reservas de invitado para este email.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {guestBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{booking.course}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmada' :
                         booking.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(booking.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {booking.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {booking.players} jugador{booking.players !== 1 ? 'es' : ''}
                      </div>
                      <div className="font-medium">
                        {formatCurrency(booking.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLinking}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleLinkBookings}
                  className="flex-1"
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    `Vincular ${guestBookings.length} Reserva${guestBookings.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}