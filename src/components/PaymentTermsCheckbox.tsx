"use client";

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CreditCard, Shield } from 'lucide-react';
import Link from 'next/link';

interface PaymentTermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  lang: string;
  disabled?: boolean;
}

export function PaymentTermsCheckbox({ 
  checked, 
  onCheckedChange, 
  lang, 
  disabled = false 
}: PaymentTermsCheckboxProps) {
  return (
    <div className="space-y-4">
      {/* Información importante sobre tarjetas */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-amber-800">
                Utiliza la Tarjeta Digital de la App de tu Banco para que tu pago sea más seguro.
              </p>
              <p className="text-amber-700">
                Si utilizas tu Tarjeta Física, es probable que el banco rechace tu pago o que tengas que presentar tu tarjeta el día del juego junto con una identificación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de seguridad */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-800">
                Pago Seguro con 3D Secure
              </p>
              <p className="text-blue-700">
                Tu pago está protegido con autenticación 3D Secure para mayor seguridad. Es posible que tu banco te solicite verificación adicional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información sobre transacciones no aprobadas */}
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-red-800">
                Si la transacción no es aprobada
              </p>
              <p className="text-red-700">
                Por favor contacta a tu banco o a nuestro Servicio al Cliente para obtener más asistencia.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkbox de términos y condiciones */}
      <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
        <Checkbox
          id="payment-terms"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="mt-1 flex-shrink-0"
        />
        <div className="space-y-1">
          <Label 
            htmlFor="payment-terms" 
            className="text-sm font-medium leading-relaxed cursor-pointer"
          >
            Acepto el uso de datos personales de acuerdo con la{' '}
            <Link 
              href={`/${lang}/privacy`} 
              className="text-primary underline hover:text-primary/80"
              target="_blank"
            >
              Política de Privacidad
            </Link>
            , y ACEPTO Y RECONOZCO el cargo que se realizará a mi tarjeta de crédito/débito según las{' '}
            <Link 
              href={`/${lang}/terms`} 
              className="text-primary underline hover:text-primary/80"
              target="_blank"
            >
              Políticas de Reservación y Cancelación
            </Link>
            .
          </Label>
          {!checked && (
            <p className="text-xs text-muted-foreground">
              Debes aceptar los términos para continuar con la reserva.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentTermsCheckbox;