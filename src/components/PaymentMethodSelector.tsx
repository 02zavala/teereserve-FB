"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Zap, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { fallbackService } from '@/lib/fallback-service';

export type PaymentMethod = 'stripe' | 'paypal';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  disabled = false 
}: PaymentMethodSelectorProps) {
  const [stripeAvailable, setStripeAvailable] = useState(true);
  const [paypalAvailable, setPaypalAvailable] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if services are available
    const checkServices = () => {
      const stripeStatus = fallbackService.getServiceStatus('stripe');
      const paypalStatus = fallbackService.getServiceStatus('paypal');
      
      setStripeAvailable(stripeStatus?.isHealthy !== false);
      setPaypalAvailable(paypalStatus?.isHealthy !== false);
      setIsOnline(navigator.onLine);
    };

    checkServices();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check services periodically
    const interval = setInterval(checkServices, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Auto-select alternative payment method if current selection is unavailable
  useEffect(() => {
    const isCurrentMethodAvailable = () => {
      switch (selectedMethod) {
        case 'stripe':
          return stripeAvailable && isOnline;
        case 'paypal':
          return paypalAvailable && isOnline;
        default:
          return false;
      }
    };

    if (!isCurrentMethodAvailable()) {
      // Auto-select the first available method
      if (stripeAvailable && isOnline) {
        onMethodChange('stripe');
      } else if (paypalAvailable && isOnline) {
        onMethodChange('paypal');
      }
    }
  }, [selectedMethod, stripeAvailable, paypalAvailable, isOnline, onMethodChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Método de Pago</h3>
          <Badge variant="secondary" className="text-xs">
            Pago Seguro
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="text-xs text-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              En línea
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Sin conexión
            </Badge>
          )}
        </div>
      </div>
      
      <RadioGroup 
        value={selectedMethod} 
        onValueChange={(value) => onMethodChange(value as PaymentMethod)}
        disabled={disabled}
        className="space-y-3"
      >
        {/* Stripe Payment Method */}
        <div className="relative">
          <RadioGroupItem 
            value="stripe" 
            id="stripe" 
            className="peer sr-only" 
            disabled={!stripeAvailable || !isOnline}
          />
          <Label 
            htmlFor="stripe" 
            className={`cursor-pointer ${(!stripeAvailable || !isOnline) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Card className={`peer-checked:ring-2 peer-checked:ring-primary peer-checked:border-primary transition-all hover:shadow-md ${(!stripeAvailable || !isOnline) ? 'border-red-200 bg-red-50/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stripeAvailable && isOnline ? 'bg-blue-100' : 'bg-red-100'}`}>
                      <CreditCard className={`h-5 w-5 ${stripeAvailable && isOnline ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Tarjeta de Crédito/Débito</CardTitle>
                        {(!stripeAvailable || !isOnline) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {stripeAvailable && isOnline 
                          ? "Visa, Mastercard, American Express" 
                          : "Temporalmente no disponible"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stripeAvailable && isOnline ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          3D Secure
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Instantáneo
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        No disponible
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stripeAvailable && isOnline ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Procesado por Stripe • Autenticación 3D Secure • Guarda tu tarjeta de forma segura</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Image src="/images/visa.svg" alt="Visa" width={32} height={20} className="opacity-70" />
                      <Image src="/images/mastercard.svg" alt="Mastercard" width={32} height={20} className="opacity-70" />
                      <Image src="/images/amex.svg" alt="American Express" width={32} height={20} className="opacity-70" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {!isOnline 
                        ? "Sin conexión a internet. Prueba con transferencia bancaria o pago en efectivo."
                        : "Servicio de pagos temporalmente no disponible. Usa métodos alternativos."
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Label>
        </div>

        {/* PayPal Payment Method */}
        <div className="relative">
          <RadioGroupItem 
            value="paypal" 
            id="paypal" 
            className="peer sr-only" 
            disabled={!paypalAvailable || !isOnline}
          />
          <Label 
            htmlFor="paypal" 
            className={`cursor-pointer ${(!paypalAvailable || !isOnline) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Card className={`peer-checked:ring-2 peer-checked:ring-primary peer-checked:border-primary transition-all hover:shadow-md ${(!paypalAvailable || !isOnline) ? 'border-red-200 bg-red-50/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${paypalAvailable && isOnline ? 'bg-blue-600' : 'bg-red-100'}`}>
                      <svg className={`h-5 w-5 ${paypalAvailable && isOnline ? 'text-white' : 'text-red-600'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106h4.61a.641.641 0 0 0 .633-.74l.654-4.15c.082-.518.526-.9 1.05-.9h1.25c3.78 0 6.73-1.54 7.59-5.99.72-3.73-.39-6.28-2.132-7.742z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">PayPal</CardTitle>
                        {(!paypalAvailable || !isOnline) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {paypalAvailable && isOnline 
                          ? "Paga con tu cuenta PayPal" 
                          : "Temporalmente no disponible"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {paypalAvailable && isOnline ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Protección
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Rápido
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        No disponible
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {paypalAvailable && isOnline ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Protección del comprador PayPal • Sin compartir datos bancarios • Pago seguro</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        PayPal
                      </div>
                      <span className="text-xs text-muted-foreground">Cuenta PayPal o tarjeta</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {!isOnline 
                        ? "Sin conexión a internet. Usa tarjeta de crédito/débito."
                        : "Servicio PayPal temporalmente no disponible. Usa tarjeta de crédito/débito."
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Label>
        </div>


      </RadioGroup>
      
      {/* Security Notice */}
      <div className="bg-muted/30 p-3 rounded-lg border">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Seguridad Garantizada</p>
            <p>Todos los pagos están protegidos con encriptación SSL de 256 bits y cumplen con los estándares PCI DSS. Tu información financiera está completamente segura.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentMethodSelector;