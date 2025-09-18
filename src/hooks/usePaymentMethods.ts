import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAbort } from '@/hooks/useFetchWithAbort';

export interface SavedPaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchWithAbort } = useFetchWithAbort();

  const fetchPaymentMethods = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/payment-methods', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response) {
        throw new Error('No response received from server');
      }

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error({ scope: 'fetchPaymentMethods', err: 'Received HTML instead of JSON', contentType, responseText: text.substring(0, 200) });
        throw new Error('Server returned an error page. Please try again.');
      }

      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        const errorMessage = data.error || 'Failed to fetch payment methods';
        console.error({ scope: 'fetchPaymentMethods', err: errorMessage, resStatus: response.status, resBody: data });
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        throw new Error(errorMessage);
      }

      setPaymentMethods(data.data?.paymentMethods || []);
    } catch (error: any) {
      console.error({ scope: 'fetchPaymentMethods', err: error });
      
      // Only show toast for non-AbortError cases to avoid spam
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load saved payment methods',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const savePaymentMethod = async (paymentMethodId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    setSaving(true);
    try {
      const token = await user.getIdToken();
      
      // Generate idempotency key for this operation
      const idempotencyKey = `save-pm-${paymentMethodId}-${Date.now()}`;
      
      const response = await fetchWithAbort('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        const errorMessage = data.error || 'Failed to save payment method';
        console.error({ scope: 'savePaymentMethod', err: errorMessage, resStatus: response.status, resBody: data });
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        if (response.status === 409) {
          throw new Error('Payment method already exists');
        }
        
        throw new Error(errorMessage);
      }

      if (data.ok && data.data?.paymentMethod) {
        setPaymentMethods(prev => {
          // Check if payment method already exists to avoid duplicates
          const exists = prev.find(pm => pm.id === data.data.paymentMethod.id);
          if (exists) return prev;
          return [...prev, data.data.paymentMethod];
        });
        
        toast({
          title: 'Éxito',
          description: 'Método de pago validado con éxito',
        });
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error({ scope: 'savePaymentMethod', err: error });
      
      const errorMessage = error.message || 'Failed to save payment method';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error; // Re-throw to allow caller to handle
    } finally {
      setSaving(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      const token = await user.getIdToken();
      const response = await fetchWithAbort('/api/payment-methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        const errorMessage = data.error || 'Failed to delete payment method';
        console.error({ scope: 'deletePaymentMethod', err: errorMessage, resStatus: response.status, resBody: data });
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        if (response.status === 404) {
          throw new Error('Payment method not found');
        }
        
        throw new Error(errorMessage);
      }

      if (data.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
        toast({
          title: 'Success',
          description: 'Payment method removed successfully',
        });
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error({ scope: 'deletePaymentMethod', err: error });
      
      const errorMessage = error.message || 'Failed to remove payment method';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error; // Re-throw to allow caller to handle
    }
  };

  const processPaymentWithSavedMethod = async (
    paymentMethodId: string,
    amount: number,
    bookingData: any
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      const token = await user.getIdToken();
      const response = await fetchWithAbort('/api/process-saved-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethodId,
          amount,
          bookingData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const data = await response.json();
      
      if (data.requiresAction) {
        return {
          success: false,
          requiresAction: true,
          clientSecret: data.clientSecret,
        };
      }
      
      if (data.success) {
        return { success: true, paymentIntent: data.paymentIntent };
      }
      
      return { success: false, error: 'Payment failed' };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
  };

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    } else {
      setPaymentMethods([]);
    }
  }, [user]);

  return {
    paymentMethods,
    loading,
    saving,
    fetchPaymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
    processPaymentWithSavedMethod,
  };
}