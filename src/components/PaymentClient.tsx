"use client";

import { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { LazyCheckoutForm } from '@/components/LazyComponents';

// Initialize Stripe outside of component to avoid re-initialization
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentClientProps {
  clientSecret?: string;
}

export default function PaymentClient({ clientSecret }: PaymentClientProps) {
  // IMPORTANT: Always execute hooks in the same order, regardless of clientSecret
  // Use useMemo to prevent options object from changing on every render
  const options = useMemo(() => {
    if (!clientSecret) {
      return undefined;
    }
    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#0570de',
          colorBackground: '#ffffff',
          colorText: '#30313d',
          colorDanger: '#df1b41',
          fontFamily: 'system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '6px',
        },
      },
    };
  }, [clientSecret]);

  // Conditional rendering ONLY in JSX, never before hooks
  if (!clientSecret || !options) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Preparando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <LazyCheckoutForm />
    </Elements>
  );
}