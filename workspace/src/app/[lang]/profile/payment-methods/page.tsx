"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SavedPaymentMethods } from '@/components/SavedPaymentMethods';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { ArrowLeft, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function AddPaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { savePaymentMethod } = usePaymentMethods();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || "An error occurred.");
        setIsProcessing(false);
        return;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || "An error occurred.");
      } else if (setupIntent && setupIntent.status === 'succeeded' && setupIntent.payment_method) {
        const result = await savePaymentMethod(setupIntent.payment_method as string);
        if (result) {
          toast({
            title: "Payment method saved",
            description: "Your payment method has been successfully saved.",
          });
          onSuccess();
        } else {
          setErrorMessage("Failed to save payment method.");
        }
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      
      {errorMessage && (
        <div className="text-destructive text-sm font-medium p-3 bg-destructive/10 rounded-md border border-destructive/20">
          {errorMessage}
        </div>
      )}
      
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</>
          ) : (
            'Save Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [isCreatingSetupIntent, setIsCreatingSetupIntent] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleAddNewMethod = async () => {
    setIsCreatingSetupIntent(true);
    try {
      const response = await fetch('/api/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { client_secret } = await response.json();
      setSetupIntentClientSecret(client_secret);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('Error creating setup intent:', error);
    } finally {
      setIsCreatingSetupIntent(false);
    }
  };

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    setSetupIntentClientSecret(null);
  };

  const handleAddCancel = () => {
    setIsAddModalOpen(false);
    setSetupIntentClientSecret(null);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <SavedPaymentMethods
            showAddButton={true}
            onAddNewMethod={handleAddNewMethod}
          />
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method to your account for faster checkout.
            </DialogDescription>
          </DialogHeader>
          
          {setupIntentClientSecret && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret: setupIntentClientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}
            >
              <AddPaymentMethodForm 
                onSuccess={handleAddSuccess}
                onCancel={handleAddCancel}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}