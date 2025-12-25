"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Calendar, Clock, Users, MapPin, CreditCard } from 'lucide-react';
import { money } from '@/lib/money-utils';
import { getDictionary } from '@/lib/get-dictionary';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import type { Locale } from '@/i18n-config';

interface Booking {
  id: string;
  courseId: string;
  courseName?: string;
  date: string;
  teeTime: string;
  players: number;
  amount: number;
  currency: string;
  status: string;
  isGuest: boolean;
  guest?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentIntentId: string;
  createdAt: any;
  pricing_snapshot?: {
    currency: string;
    tax_rate: number;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    quote_hash?: string;
    createdAt: string;
    promo_code?: string;
  };
}

function BookingConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useParams() as { lang: Locale };
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dict, setDict] = useState<any>(null);
  
  const bookingId = searchParams?.get('id');

  useEffect(() => {
    if (!bookingId) {
      router.push(`/${lang}/courses`);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/v1/bookings/${bookingId}`, { headers: { 'x-tenant-id': 'default' } });
        if (!res.ok) {
          setError('Reserva no encontrada');
          return;
        }
        const json = await res.json();
        setBooking(json.data as Booking);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Error al cargar la reserva');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router, lang]);

  useEffect(() => {
    getDictionary(lang).then(setDict).catch(() => setDict(null));
  }, [lang]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-6">
              <div className="text-destructive mb-4">
                <h2 className="text-xl font-semibold">Error</h2>
                <p className="text-muted-foreground mt-2">{error || 'Reserva no encontrada'}</p>
              </div>
              <Button onClick={() => router.push(`/${lang}/courses`)}>
                Volver a Cursos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  };

  // Calcular desglose de precios
  const calculatePriceBreakdown = (totalAmount: number) => {
    // El total ya incluye impuestos, calculamos hacia atrás
    const subtotal = totalAmount / 1.16; // Dividir por 1.16 para obtener el subtotal
    const tax = totalAmount - subtotal; // La diferencia son los impuestos
    const discount = 0; // Por ahora no hay descuentos implementados
    
    return {
      subtotal: Math.round(subtotal), // Redondear a centavos
      tax: Math.round(tax),
      discount: Math.round(discount),
      total: totalAmount
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-600">{dict?.confirm?.title || '¡Reserva Confirmada!'}</h1>
          <p className="text-muted-foreground mt-2">
            {dict?.confirm?.subtitle || 'Tu reserva ha sido procesada exitosamente'}
          </p>
        </div>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{dict?.confirm?.details || 'Detalles de la Reserva'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.courseName || 'Campo de Golf'}</p>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.course || 'Campo'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDate(booking.date)}</p>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.date || 'Fecha'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.teeTime}</p>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.teeTime || 'Hora de salida'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.players} jugador{booking.players > 1 ? 'es' : ''}</p>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.players || 'Participantes'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest Information */}
        {booking.isGuest && booking.guest && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{dict?.confirm?.contact || 'Información del Contacto'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.name || 'Nombre'}</p>
                  <p className="font-medium">{booking.guest.firstName} {booking.guest.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.email || 'Email'}</p>
                  <p className="font-medium">{booking.guest.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{dict?.confirm?.phone || 'Teléfono'}</p>
                  <p className="font-medium">{booking.guest?.phone || booking['customerInfo']?.phone || 'No proporcionado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {dict?.confirm?.payment || 'Información de Pago'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Price Breakdown */}
            <div className="space-y-3 mb-4">
              {booking.pricing_snapshot ? (
                <PriceBreakdown 
                  pricing={{
                    subtotal: booking.pricing_snapshot.subtotal_cents / 100,
                    tax: booking.pricing_snapshot.tax_cents / 100,
                    discount: booking.pricing_snapshot.discount_cents / 100,
                    total: booking.pricing_snapshot.total_cents / 100,
                    promo_code: booking.pricing_snapshot.promo_code
                  }}
                  showDiscountWhenZero={false}
                  className="border-0 shadow-none"
                />
              ) : (
                (() => {
                  const priceBreakdown = calculatePriceBreakdown(booking.amount);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{dict?.confirm?.subtotal || 'Subtotal:'}</span>
                        <span className="font-medium">{formatAmount(priceBreakdown.subtotal, booking.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{dict?.confirm?.tax || 'Impuestos (16%):'}</span>
                        <span className="font-medium">{formatAmount(priceBreakdown.tax, booking.currency)}</span>
                      </div>
                      {priceBreakdown.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{dict?.confirm?.discount || 'Descuento:'}</span>
                          <span className="font-medium text-green-600">-{formatAmount(priceBreakdown.discount, booking.currency)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">{dict?.confirm?.total || 'Total Pagado:'}</span>
                          <span className="text-2xl font-bold text-green-600">
                            {money(priceBreakdown.total, booking.currency, lang === 'es' ? 'es-ES' : 'en-US')}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium text-green-600 capitalize">{booking.status}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                ID de Transacción: {booking.paymentIntentId}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/${lang}/courses`)}
            className="flex-1"
          >
            Explorar Más Cursos
          </Button>
          <Button 
            onClick={() => window.print()}
            className="flex-1"
          >
            Imprimir Confirmación
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Información Importante</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Llega al menos 30 minutos antes de tu hora de salida</li>
            <li>• Trae una identificación válida</li>
            <li>• Revisa las reglas del campo antes de jugar</li>
            <li>• Para cancelaciones, contacta al campo directamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    }>
      <BookingConfirmContent />
    </Suspense>
  );
}