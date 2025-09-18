
"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { createPaymentIntent } from '@/ai/flows/create-payment-intent';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

// Dynamic import with SSR disabled to prevent hydration issues
const PaymentClient = dynamic(() => import('@/components/PaymentClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Loading payment system...</p>
    </div>
  ),
});

const TAX_RATE = 0.16; // 16%

function ConfirmPageContent() {
    const searchParams = useSearchParams();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // useMemo to prevent re-running on every render
    const params = useMemo(() => ({
      price: searchParams?.get('price'),
    }), [searchParams]);


    useEffect(() => {
        if (params.price && !isInitialized) {
            setIsInitialized(true);
            const subtotal = parseFloat(params.price);
            const tax = subtotal * TAX_RATE;
            const total = subtotal + tax;

            createPaymentIntent({ amount: Math.round(total * 100), currency: 'usd' }) // Convert to cents
                .then(data => {
                    setClientSecret(data.clientSecret);
                })
                .catch(err => {
                    console.error("Failed to create payment intent:", err);
                    setError("Could not initialize payment. Please try again.");
                    setIsInitialized(false); // Allow retry
                });
        }
    }, [params, isInitialized]);

    if (error) {
        return <div className="text-center text-destructive">{error}</div>;
    }

    if (!clientSecret) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Preparing secure payment...</p>
            </div>
        );
    }

    return <PaymentClient clientSecret={clientSecret} />;
}

export default function ConfirmPage() {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ConfirmPageContent />
      </Suspense>
    )
}
