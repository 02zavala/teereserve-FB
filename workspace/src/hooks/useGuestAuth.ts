import { useState, useCallback } from 'react';
import { getAuth, signInAnonymously, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

interface GuestBookingData {
  courseId: string;
  date: string;
  teeTime: string;
  players: number;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface UseGuestAuthReturn {
  isLoading: boolean;
  error: string | null;
  signInAsGuest: () => Promise<void>;
  createGuestBookingIntent: (data: GuestBookingData) => Promise<{ clientSecret: string; draftId: string }>;
  finalizeGuestBooking: (draftId: string, paymentIntentId: string, userIdToLink?: string) => Promise<{ bookingId: string }>;
  linkGuestToAccount: (email: string, password: string) => Promise<void>;
  upgradeGuestAccount: (email: string, password: string, displayName: string, bookingIds?: string[]) => Promise<{ userId: string; migratedBookings: number }>;
  linkGuestBookings: (guestUserId: string, authenticatedUserId: string, bookingIds?: string[]) => Promise<{ linkedBookings: number }>;
}

export function useGuestAuth(): UseGuestAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const signInAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const auth = getAuth();
      if (!user) {
        await signInAnonymously(auth);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in as guest');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createGuestBookingIntent = useCallback(async (data: GuestBookingData) => {
    try {
      setIsLoading(true);
      setError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/create-guest-booking-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking intent');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking intent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const finalizeGuestBooking = useCallback(async (draftId: string, paymentIntentId: string, userIdToLink?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/finalize-guest-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ draftId, paymentIntentId, userIdToLink }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize booking');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize booking');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const linkGuestToAccount = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error('No anonymous user to link');
      }

      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upgradeGuestAccount = useCallback(async (
    email: string, 
    password: string, 
    displayName: string, 
    bookingIds?: string[]
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error('Only anonymous users can upgrade to account');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/upgrade-guest-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          guestBookingIds: bookingIds
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to upgrade account');
      }

      return {
        userId: result.userId,
        migratedBookings: result.migratedBookings
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade account');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const linkGuestBookings = useCallback(async (
    guestUserId: string,
    authenticatedUserId: string,
    bookingIds?: string[]
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/link-guest-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          guestUserId,
          authenticatedUserId,
          bookingIds
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link guest bookings');
      }

      return {
        linkedBookings: result.linkedBookings
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link guest bookings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    signInAsGuest,
    createGuestBookingIntent,
    finalizeGuestBooking,
    linkGuestToAccount,
    upgradeGuestAccount,
    linkGuestBookings,
  };
}