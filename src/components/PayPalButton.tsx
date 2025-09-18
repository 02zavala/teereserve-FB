"use client";

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface PayPalButtonProps {
  amount: number;
  currency?: string;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

const paypalOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  currency: 'USD',
  intent: 'capture',
  components: 'buttons',
  'enable-funding': 'venmo,paylater',
  'disable-funding': 'credit,card'
};

export function PayPalButton({ 
  amount, 
  currency = 'USD', 
  onSuccess, 
  onError, 
  disabled = false 
}: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createOrder = (data: any, actions: any) => {
    logger.info('PayPal: Creating order', 'paypal', { amount, currency });
    
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: 'TeeReserve Golf - Reserva de Tee Time'
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING'
      }
    });
  };

  const onApprove = async (data: any, actions: any) => {
    setIsLoading(true);
    
    try {
      logger.info('PayPal: Payment approved', 'paypal', { orderId: data.orderID });
      
      const details = await actions.order.capture();
      
      logger.info('PayPal: Payment captured successfully', 'paypal', {
        orderId: data.orderID,
        paymentId: details.id,
        status: details.status
      });
      
      toast({
        title: "Pago exitoso",
        description: "Tu pago con PayPal ha sido procesado correctamente.",
        variant: "default"
      });
      
      onSuccess(details);
    } catch (error) {
      logger.error('PayPal: Payment capture failed', error instanceof Error ? error : new Error(String(error)), 'paypal', { orderId: data.orderID });
      
      toast({
        title: "Error en el pago",
        description: "Hubo un problema al procesar tu pago con PayPal. Inténtalo de nuevo.",
        variant: "destructive"
      });
      
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onErrorHandler = (error: any) => {
    logger.error('PayPal: Payment error', error instanceof Error ? error : new Error(String(error)), 'paypal');
    
    toast({
      title: "Error en PayPal",
      description: "Hubo un problema con PayPal. Por favor, inténtalo de nuevo o usa otro método de pago.",
      variant: "destructive"
    });
    
    onError(error);
  };

  const onCancel = (data: any) => {
    logger.info('PayPal: Payment cancelled', 'paypal', { orderId: data.orderID });
    
    toast({
      title: "Pago cancelado",
      description: "Has cancelado el pago con PayPal.",
      variant: "default"
    });
  };

  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            PayPal no está configurado correctamente.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando pago con PayPal...
          </div>
        </div>
      )}
      
      <PayPalScriptProvider options={paypalOptions}>
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
            height: 45
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onErrorHandler}
          onCancel={onCancel}
          disabled={disabled || isLoading}
        />
      </PayPalScriptProvider>
    </div>
  );
}

export default PayPalButton;