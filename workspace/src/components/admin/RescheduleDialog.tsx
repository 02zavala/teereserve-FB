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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Calendar as CalendarIcon, Clock, DollarSign, CheckCircle, X, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { CancellationValidators } from '@/lib/cancellation-policies';

interface RescheduleDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (rescheduleData: RescheduleData) => void;
}

interface RescheduleData {
  bookingId: string;
  newDate: Date;
  newTime: string;
  priceDifference: number;
  adminNotes?: string;
  rescheduleReason: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  price: number;
}

interface PriceCalculation {
  originalPrice: number;
  newPrice: number;
  difference: number;
  rescheduleeFee: number;
  totalAdjustment: number;
}

export function RescheduleDialog({ booking, open, onOpenChange, onConfirm }: RescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('customer_request');
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setSelectedTime('');
      setAdminNotes('');
      setRescheduleReason('customer_request');
      setAvailableSlots([]);
      setPriceCalculation(null);
    }
  }, [open]);

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedTime('');
      setPriceCalculation(null);
    }
  }, [selectedDate]);

  // Calculate price when time changes
  useEffect(() => {
    if (selectedTime && selectedDate) {
      calculatePriceDifference(selectedDate, selectedTime);
    } else {
      setPriceCalculation(null);
    }
  }, [selectedTime, selectedDate]);

  const loadAvailableSlots = async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      // Simular carga de slots disponibles
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generar slots de ejemplo
      const slots: TimeSlot[] = [
        { time: '07:00', available: true, price: 80 },
        { time: '07:30', available: false, price: 80 },
        { time: '08:00', available: true, price: 90 },
        { time: '08:30', available: true, price: 90 },
        { time: '09:00', available: false, price: 100 },
        { time: '09:30', available: true, price: 100 },
        { time: '10:00', available: true, price: 110 },
        { time: '10:30', available: true, price: 110 },
        { time: '11:00', available: false, price: 120 },
        { time: '11:30', available: true, price: 120 },
        { time: '12:00', available: true, price: 130 },
        { time: '12:30', available: true, price: 130 },
        { time: '13:00', available: true, price: 120 },
        { time: '13:30', available: false, price: 120 },
        { time: '14:00', available: true, price: 110 },
        { time: '14:30', available: true, price: 110 },
        { time: '15:00', available: true, price: 100 },
        { time: '15:30', available: true, price: 100 },
        { time: '16:00', available: true, price: 90 },
        { time: '16:30', available: false, price: 90 },
      ];
      
      setAvailableSlots(slots);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios disponibles.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const calculatePriceDifference = (date: Date, time: string) => {
    const slot = availableSlots.find(s => s.time === time);
    if (!slot) return;

    const originalPrice = booking.totalPrice;
    const newPrice = slot.price;
    const difference = newPrice - originalPrice;
    const rescheduleeFee = 10; // Tarifa fija de reprogramación
    const totalAdjustment = difference + rescheduleeFee;

    setPriceCalculation({
      originalPrice,
      newPrice,
      difference,
      rescheduleeFee,
      totalAdjustment,
    });
  };

  const canReschedule = () => {
    return CancellationValidators.canReschedule(booking.status, new Date(booking.date));
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime || !priceCalculation) return;

    setIsLoading(true);
    try {
      const rescheduleData: RescheduleData = {
        bookingId: booking.id,
        newDate: selectedDate,
        newTime: selectedTime,
        priceDifference: priceCalculation.totalAdjustment,
        adminNotes: adminNotes || undefined,
        rescheduleReason,
      };

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onConfirm) {
        onConfirm(rescheduleData);
      }

      toast({
        title: "Reprogramación exitosa",
        description: `La reserva ha sido reprogramada para el ${format(selectedDate, 'dd/MM/yyyy', { locale: es })} a las ${selectedTime}.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la reprogramación. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    customer_request: 'Solicitud del cliente',
    weather: 'Condiciones climáticas',
    maintenance: 'Mantenimiento del campo',
    admin_adjustment: 'Ajuste administrativo',
    overbooking: 'Resolución de sobreventa',
    other: 'Otro motivo',
  };

  if (!canReschedule()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              No se puede reprogramar
            </DialogTitle>
            <DialogDescription>
              Esta reserva no puede ser reprogramada debido a su estado actual o porque ya ha pasado la fecha.
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprogramar Reserva #{booking.id.substring(0, 7)}</DialogTitle>
          <DialogDescription>
            Selecciona una nueva fecha y hora para la reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información actual */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reserva Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{booking.userName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">{new Date(booking.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hora:</span>
                    <span className="font-medium">{booking.time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jugadores:</span>
                    <span className="font-medium">{booking.players}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-medium">${booking.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motivo de reprogramación */}
            <div className="space-y-3">
              <Label htmlFor="reason">Motivo de reprogramación</Label>
              <Select value={rescheduleReason} onValueChange={setRescheduleReason}>
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

            {/* Notas administrativas */}
            <div className="space-y-3">
              <Label htmlFor="adminNotes">Notas administrativas</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Agregar notas sobre esta reprogramación..."
                rows={3}
              />
            </div>
          </div>

          {/* Nueva fecha y hora */}
          <div className="space-y-4">
            {/* Selector de fecha */}
            <div className="space-y-3">
              <Label>Nueva fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date < new Date(Date.now() + 24 * 60 * 60 * 1000)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Selector de hora */}
            {selectedDate && (
              <div className="space-y-3">
                <Label>Nueva hora</Label>
                {isLoadingSlots ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Cargando horarios...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="flex flex-col h-auto py-2"
                      >
                        <span className="font-medium">{slot.time}</span>
                        <span className="text-xs">${slot.price}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cálculo de precio */}
            {priceCalculation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Ajuste de Precio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Precio original:</span>
                      <span>${priceCalculation.originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Precio nuevo:</span>
                      <span>${priceCalculation.newPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Diferencia:</span>
                      <span className={priceCalculation.difference >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {priceCalculation.difference >= 0 ? '+' : ''}${priceCalculation.difference.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tarifa de reprogramación:</span>
                      <span className="text-red-600">+${priceCalculation.rescheduleeFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Ajuste total:</span>
                      <span className={priceCalculation.totalAdjustment >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {priceCalculation.totalAdjustment >= 0 ? '+' : ''}${priceCalculation.totalAdjustment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {priceCalculation.totalAdjustment > 0 && (
                    <div className="bg-red-50 p-3 rounded-md">
                      <p className="text-sm text-red-700">
                        Se cobrará un cargo adicional de ${priceCalculation.totalAdjustment.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  {priceCalculation.totalAdjustment < 0 && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-sm text-green-700">
                        Se aplicará un crédito de ${Math.abs(priceCalculation.totalAdjustment).toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {selectedDate && selectedTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                {format(selectedDate, 'dd/MM', { locale: es })} a las {selectedTime}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleReschedule} 
              disabled={isLoading || !selectedDate || !selectedTime}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isLoading ? 'Procesando...' : 'Confirmar Reprogramación'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}