import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { enableNetwork, disableNetwork } from 'firebase/firestore';

interface FirestoreConnectionState {
  isOnline: boolean;
  isConnected: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export const useFirestoreConnection = () => {
  const [state, setState] = useState<FirestoreConnectionState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isConnected: false,
    hasError: false,
    errorMessage: null,
  });

  useEffect(() => {
    if (!db) {
      setState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: 'Firestore no está inicializado'
      }));
      return;
    }

    const handleOnline = async () => {
      try {
        await enableNetwork(db);
        setState(prev => ({
          ...prev,
          isOnline: true,
          isConnected: true,
          hasError: false,
          errorMessage: null,
        }));
        console.log('🌐 Firestore: Conectividad restaurada');
      } catch (error: any) {
        console.warn('Error al habilitar red en Firestore:', error);
        setState(prev => ({
          ...prev,
          isOnline: true,
          isConnected: false,
          hasError: true,
          errorMessage: error.message,
        }));
      }
    };

    const handleOffline = async () => {
      try {
        await disableNetwork(db);
        setState(prev => ({
          ...prev,
          isOnline: false,
          isConnected: false,
          hasError: false,
          errorMessage: null,
        }));
        console.log('📴 Firestore: Modo offline activado');
      } catch (error: any) {
        console.warn('Error al deshabilitar red en Firestore:', error);
        setState(prev => ({
          ...prev,
          isOnline: false,
          isConnected: false,
          hasError: true,
          errorMessage: error.message,
        }));
      }
    };

    // Verificar estado inicial
    const checkInitialState = async () => {
      if (navigator.onLine) {
        await handleOnline();
      } else {
        await handleOffline();
      }
    };

    checkInitialState();

    // Escuchar cambios de conectividad
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Manejar errores específicos de Firestore de forma silenciosa
    const handleFirestoreError = (error: any) => {
      const message = error?.message || String(error);
      
      // Manejar errores conocidos de Firestore
      if (message.includes('Could not reach Cloud Firestore backend') ||
          message.includes('Fetching auth token failed') ||
          message.includes('auth/network-request-failed') ||
          message.includes('Failed to get document because the client is offline') ||
          message.includes('net::ERR_ABORTED') ||
          message.includes('ERR_ABORTED')) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          hasError: false, // No consideramos esto como error crítico
          errorMessage: 'Operando en modo offline',
        }));
        
        // Solo log en desarrollo para debugging
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔄 Firestore offline mode activated');
        }
        return true; // Indica que el error fue manejado
      }
      
      return false; // Indica que el error no fue manejado
    };

    // Interceptar errores de XMLHttpRequest para Firestore
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', (event) => {
        if (this.responseURL && this.responseURL.includes('firestore.googleapis.com')) {
          // Suprimir errores de red de Firestore
          event.stopPropagation();
          event.preventDefault();
        }
      });
      return originalXHRSend.apply(this, args);
    };

    // Exponer el manejador de errores para que otros hooks puedan usarlo
    (window as any).__firestoreErrorHandler = handleFirestoreError;

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      XMLHttpRequest.prototype.send = originalXHRSend;
      delete (window as any).__firestoreErrorHandler;
    };
  }, []);

  const reconnect = async () => {
    if (db && navigator.onLine) {
      try {
        await enableNetwork(db);
        setState(prev => ({
          ...prev,
          isConnected: true,
          hasError: false,
          errorMessage: null,
        }));
        console.log('🔄 Firestore: Reconectando...');
      } catch (error: any) {
        console.warn('Error al reconectar Firestore:', error);
        setState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: error.message,
        }));
      }
    }
  };

  return {
    ...state,
    reconnect,
  };
};