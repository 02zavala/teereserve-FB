"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { PaymentMethod } from '@/components/PaymentMethodSelector';

interface CustomPaymentHandlerProps {
  paymentMethod: PaymentMethod;
  amount: number;
  bookingId: string;
  onPaymentConfirmed: () => void;
  onCancel: () => void;
}

export function CustomPaymentHandler({
  paymentMethod,
  amount,
  bookingId,
  onPaymentConfirmed,
  onCancel
}: CustomPaymentHandlerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (paymentMethod === 'bank_transfer') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="2" y1="7" x2="22" y2="7"/>
                  </svg>
                </div>
                Transferencia Bancaria
              </CardTitle>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                24-48 horas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Realiza la transferencia con los siguientes datos. Una vez confirmado el pago, recibirás la confirmación de tu reserva.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Banco</label>
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-mono">BBVA Bancomer</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('BBVA Bancomer', 'bank')}
                    >
                      {copied === 'bank' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Cuenta</label>
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-mono">0123456789</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('0123456789', 'account')}
                    >
                      {copied === 'account' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">CLABE</label>
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-mono">012345678901234567</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('012345678901234567', 'clabe')}
                    >
                      {copied === 'clabe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Beneficiario</label>
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-mono">TeeReserve Golf S.A. de C.V.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('TeeReserve Golf S.A. de C.V.', 'beneficiary')}
                    >
                      {copied === 'beneficiary' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Monto a transferir:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(amount)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-gray-600">Referencia:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{bookingId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bookingId, 'reference')}
                    >
                      {copied === 'reference' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Importante:</strong> Incluye la referencia "{bookingId}" en el concepto de la transferencia para identificar tu pago correctamente.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={onPaymentConfirmed} className="flex-1">
                Confirmar Transferencia Realizada
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentMethod === 'cash') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                Pago en Efectivo
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Sin comisión
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Tu reserva quedará pendiente de pago. Debes presentarte en el club para completar el pago antes de tu tee time.
              </AlertDescription>
            </Alert>

            <div className="bg-amber-50 p-4 rounded-lg space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-700 mb-2">
                  {formatCurrency(amount)}
                </div>
                <p className="text-sm text-amber-600">Monto a pagar en efectivo</p>
              </div>

              <div className="border-t border-amber-200 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Ubicación</p>
                    <p className="text-sm text-amber-600">Recepción del Club de Golf TeeReserve</p>
                    <p className="text-sm text-amber-600">Av. Golf Club 123, Ciudad de México</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Horario de Pago</p>
                    <p className="text-sm text-amber-600">Lunes a Domingo: 6:00 AM - 8:00 PM</p>
                    <p className="text-sm text-amber-600">Debes llegar 15 minutos antes de tu tee time</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Contacto</p>
                    <p className="text-sm text-amber-600">Tel: (55) 1234-5678</p>
                    <p className="text-sm text-amber-600">WhatsApp: (55) 9876-5432</p>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Código de Reserva:</strong> {bookingId}
                <br />
                Presenta este código en recepción para identificar tu reserva.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={onPaymentConfirmed} className="flex-1">
                Confirmar Reserva (Pago Pendiente)
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default CustomPaymentHandler;