"use client";

import { useState } from 'react';
import { linkWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

interface AccountLinkingData {
  email: string;
  password: string;
  displayName: string;
  bookingId?: string;
}

interface UseAccountLinkingReturn {
  linkAccount: (data: AccountLinkingData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  resetState: () => void;
}

export function useAccountLinking(): UseAccountLinkingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const linkAccount = async (data: AccountLinkingData) => {
    if (!user || !user.isAnonymous) {
      throw new Error('Solo usuarios anónimos pueden vincular una cuenta');
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const db = getFirestore();
      
      // Create email credential
      const credential = EmailAuthProvider.credential(data.email, data.password);
      
      // Link the anonymous account with email/password
      const result = await linkWithCredential(user, credential);
      
      // Update the user profile
      await updateProfile(result.user, {
        displayName: data.displayName
      });

      // Check if user document already exists
      const userDocRef = doc(db, 'users', result.user.uid);
      
      const userData = {
        email: data.email,
        displayName: data.displayName,
        createdAt: new Date(),
        isEmailVerified: false,
        accountType: 'converted_guest',
        preferences: {
          notifications: true,
          marketing: false
        }
      };

      // If there's a booking ID, add it to linked bookings
      if (data.bookingId) {
        (userData as any).linkedBookings = [data.bookingId];
      }

      await setDoc(userDocRef, userData, { merge: true });

      // If there's a booking ID, also update the booking document
      if (data.bookingId) {
        const bookingRef = doc(db, 'bookings', data.bookingId);
        await updateDoc(bookingRef, {
          userId: result.user.uid,
          userEmail: data.email,
          accountLinked: true,
          linkedAt: new Date()
        });
      }

      setSuccess(true);

    } catch (error: any) {
      console.error('Error linking account:', error);
      
      let errorMessage = 'Error al crear la cuenta. Inténtalo de nuevo.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión en su lugar.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email no es válido.';
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'Estas credenciales ya están en uso por otra cuenta.';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  };

  return {
    linkAccount,
    isLoading,
    error,
    success,
    resetState
  };
}

// Helper function to check if a user can link an account
export function canLinkAccount(user: any): boolean {
  return user && user.isAnonymous && !user.email;
}

// Helper function to get anonymous user booking data
export async function getAnonymousUserBookings(userId: string) {
  const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
  const db = getFirestore();
  
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    where('isAnonymous', '==', true)
  );
  
  const snapshot = await getDocs(bookingsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}