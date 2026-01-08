"use client";

import { useState, useEffect } from 'react';
import type { Booking, BookingStatus, PaymentStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar, Clock, Users, DollarSign, AlertTriangle, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useErrorHandler, commonValidators } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { format } from 'date-fns';

interface BookingEditDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedBooking: Partial<Booking>) => void;
}

interface BookingChanges {
  date?: string;
  time?: string;
  players?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  comments?: string;
  adminNotes?: string;
  status?: BookingStatus;
}

interface PriceCalculation {
  originalPrice: number;
  newPrice: number;
  difference: number;
  refundAmount: number;
  additionalCharge: number;
}

export function BookingEditDialog({ booking, open, onOpenChange, onSave }: BookingEditDialogProps) {
  const [changes, setChanges] = useState<BookingChanges>({});
  const [isLoading, setIsLoading] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [activeTab, setActiveTab] = useState('datetime');
  const { handleAsyncError } = useErrorHandler();

  // Reset changes when dialog opens/closes
  useEffect(() => {
    if (open) {
      setChanges({});
      setPriceCalculation(null);
      setActiveTab('datetime');
    }
  }, [open]);

  // Calculate price changes when relevant fields change
  useEffect(() => {
    if (changes.date || changes.time || changes.players) {
      calculatePriceChanges();
    }
  }, [changes.date, changes.time, changes.players]);

  const calculatePriceChanges = () => {
    // Simulación de cálculo de precios
    const basePrice = 50; // Precio base por jugador
    const originalPlayers = booking.players;
    const newPlayers = changes.players || originalPlayers;
    
    const originalPrice = booking.totalPrice;
    const newPrice = basePrice * newPlayers;
    const difference = newPrice - originalPrice;
    
    setPriceCalculation({
      originalPrice,
      newPrice,
      difference,
      refundAmount: difference < 0 ? Math.abs(difference) : 0,
      additionalCharge: difference > 0 ? difference : 0,
    });
  };

  const getRefundPolicy = () => {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const diffMs = bookingDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (hoursUntil >= 48) {
      return { percent: 100, message: 'Reembolso completo (100%)' };
    } else if (hoursUntil >= 24) {
      return { percent: 50, message: 'Reembolso parcial (50%)' };
    } else {
      return { percent: 0, message: 'Sin reembolso (0%)' };
    }
  };

  const isPastBooking = () => {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    return bookingDate < now;
  };

  const canEditDateTime = () => {
    return !isPastBooking() && ['pending', 'confirmed'].includes(booking.status);
  };

  const canEditPlayers = () => {
    return !isPastBooking() && ['pending', 'confirmed', 'rescheduled'].includes(booking.status);
  };

  const handleSave = () => {
    handleAsyncError(async () => {
      console.log('Starting booking edit with changes:', { ...changes, bookingId: booking.id });
      
      // Validación de datos básicos
      if (!booking.id || !booking.id.trim()) {
        throw new ValidationError('Booking ID is required');
      }
      
      // Validar número de jugadores
      if (changes.players !== undefined) {
        if (!Number.isInteger(changes.players) || changes.players < 1 || changes.players > 4) {
          throw new ValidationError('Number of players must be between 1 and 4');
        }
      }
      
      // Validar email del cliente
      if (changes.customerEmail !== undefined) {
        if (changes.customerEmail.trim() === '') {
          throw new ValidationError('Customer email cannot be empty');
        }
        
        if (!commonValidators.isValidEmail(changes.customerEmail)) {
          throw new ValidationError('Please enter a valid email address');
        }
        
        if (changes.customerEmail.length > 254) {
          throw new ValidationError('Email address is too long');
        }
      }
      
      // Validar teléfono del cliente
      if (changes.customerPhone !== undefined) {
        if (changes.customerPhone.trim() !== '' && !commonValidators.phoneNumber(changes.customerPhone)) {
          throw new ValidationError('Please enter a valid phone number');
        }
      }
      
      // Validar nombre del cliente
      if (changes.customerName !== undefined) {
        if (changes.customerName.trim() === '') {
          throw new ValidationError('Customer name cannot be empty');
        }
        
        if (changes.customerName.trim().length < 2) {
          throw new ValidationError('Customer name must be at least 2 characters');
        }
        
        if (changes.customerName.length > 100) {
          throw new ValidationError('Customer name is too long');
        }
        
        if (!/^[a-zA-Z\s\-'.]+$/.test(changes.customerName.trim())) {
          throw new ValidationError('Customer name contains invalid characters');
        }
      }
      
      // Validar fecha
      if (changes.date !== undefined) {
        const selectedDate = new Date(changes.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(selectedDate.getTime())) {
          throw new ValidationError('Invalid date format');
        }
        
        if (selectedDate < today) {
          throw new ValidationError('Cannot schedule booking for a past date');
        }
        
        // Validar que la fecha no sea más de 1 año en el futuro
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (selectedDate > oneYearFromNow) {
          throw new ValidationError('Cannot schedule booking more than 1 year in advance');
        }
      }
      
      // Validar hora
      if (changes.time !== undefined) {
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(changes.time)) {
          throw new ValidationError('Invalid time format (use HH:MM)');
        }
      }
      
      // Validar notas y comentarios
      if (changes.comments !== undefined && changes.comments.length > 1000) {
        throw new ValidationError('Comments are too long (maximum 1000 characters)');
      }
      
      if (changes.adminNotes !== undefined && changes.adminNotes.length > 1000) {
        throw new ValidationError('Admin notes are too long (maximum 1000 characters)');
      }
      
      // Validar estado de la reserva
      if (changes.status !== undefined) {
        const validStatuses: BookingStatus[] = ['pending', 'confirmed', 'rescheduled', 'canceled_admin', 'canceled_customer', 'completed', 'no_show', 'checked_in'];
        if (!validStatuses.includes(changes.status)) {
          throw new ValidationError('Invalid booking status');
        }
      }
      
      // Verificar si la reserva puede ser editada
      if (isPastBooking() && !['completed', 'no_show', 'checked_in'].includes(changes.status || booking.status)) {
        throw new ValidationError('Cannot edit past bookings except to mark as completed or no-show');
      }
      
      if (['canceled_customer', 'canceled_admin', 'disputed'].includes(booking.status) && !changes.status) {
        throw new ValidationError(`Cannot edit booking with status: ${booking.status}`);
      }
      
      // Verificar que hay cambios para guardar
      if (Object.keys(changes).length === 0) {
        throw new ValidationError('No changes to save');
      }
      
      setIsLoading(true);
      
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSave) {
        onSave(changes);
      }
      
      toast({
        title: "Booking Updated",
        description: "Changes have been saved successfully.",
      });
      
      onOpenChange(false);
      console.log('Booking edit completed successfully');
      
      return true;
    }, {
      defaultMessage: 'Failed to save booking changes. Please try again.',
      onError: (error) => {
        console.error('Booking edit error:', {
          error,
          bookingId: booking.id,
          changes,
          timestamp: new Date().toISOString()
        });
      }
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const hasChanges = Object.keys(changes).length > 0;
  const refundPolicy = getRefundPolicy();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Reserva #{booking.id.substring(0, 7)}</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la reserva. Los cambios se aplicarán inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="datetime">Fecha & Hora</TabsTrigger>
            <TabsTrigger value="players">Jugadores</TabsTrigger>
            <TabsTrigger value="customer">Cliente</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="datetime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Fecha y Hora
                </CardTitle>
                {!canEditDateTime() && (
                  <CardDescription className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    No se puede modificar la fecha/hora de reservas pasadas o en ciertos estados
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Fecha actual</Label>
                    <Input 
                      value={format(new Date(booking.date), 'yyyy-MM-dd')} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Hora actual</Label>
                    <Input 
                      value={booking.time} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                {canEditDateTime() && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newDate">Nueva fecha</Label>
                      <Input 
                        id="newDate"
                        type="date"
                        value={changes.date || ''}
                        onChange={(e) => setChanges(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newTime">Nueva hora</Label>
                      <Input 
                        id="newTime"
                        type="time"
                        value={changes.time || ''}
                        onChange={(e) => setChanges(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Número de Jugadores
                </CardTitle>
                {!canEditPlayers() && (
                  <CardDescription className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    No se puede modificar el número de jugadores en este estado
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jugadores actuales</Label>
                    <Input value={booking.players} disabled className="bg-muted" />
                  </div>
                  {canEditPlayers() && (
                    <div>
                      <Label htmlFor="newPlayers">Nuevos jugadores</Label>
                      <Select 
                        value={changes.players?.toString() || ''} 
                        onValueChange={(value) => setChanges(prev => ({ ...prev, players: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Jugador</SelectItem>
                          <SelectItem value="2">2 Jugadores</SelectItem>
                          <SelectItem value="3">3 Jugadores</SelectItem>
                          <SelectItem value="4">4 Jugadores</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {priceCalculation && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cálculo de Precios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Precio original:</span>
                        <span>${priceCalculation.originalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Nuevo precio:</span>
                        <span>${priceCalculation.newPrice.toFixed(2)}</span>
                      </div>
                      <Separator />
                      {priceCalculation.difference !== 0 && (
                        <div className={`flex justify-between font-medium ${
                          priceCalculation.difference > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          <span>
                            {priceCalculation.difference > 0 ? 'Cargo adicional:' : 'Reembolso:'}
                          </span>
                          <span>${Math.abs(priceCalculation.difference).toFixed(2)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Nombre</Label>
                  <Input 
                    id="customerName"
                    value={changes.customerName ?? booking.userName}
                    onChange={(e) => setChanges(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input 
                    id="customerEmail"
                    type="email"
                    value={changes.customerEmail ?? (booking.customerInfo?.email || '')}
                    onChange={(e) => setChanges(prev => ({ ...prev, customerEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  <Input 
                    id="customerPhone"
                    value={changes.customerPhone ?? ''}
                    onChange={(e) => setChanges(prev => ({ ...prev, customerPhone: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comentarios y Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comments">Comentarios del cliente</Label>
                  <Textarea 
                    id="comments"
                    value={changes.comments ?? (booking.comments || '')}
                    onChange={(e) => setChanges(prev => ({ ...prev, comments: e.target.value }))}
                    placeholder="Comentarios o solicitudes especiales..."
                  />
                </div>
                <div>
                  <Label htmlFor="adminNotes">Notas administrativas</Label>
                  <Textarea 
                    id="adminNotes"
                    value={changes.adminNotes ?? ''}
                    onChange={(e) => setChanges(prev => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="Notas internas para el equipo..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600">
                Cambios pendientes
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}