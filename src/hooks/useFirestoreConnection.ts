import { useState, useEffect, useRef } from 'react';
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

  // Ref para evitar llamadas duplicadas
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!db || typeof window === 'undefined') return;

    const handleOnline = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
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
        // Ignorar errores de "Target ID already exists" ya que indican que la red ya está habilitada
        if (error.code === 'already-exists' || error.message?.includes('Target ID already exists')) {
          console.log('🌐 Firestore: Red ya habilitada');
          setState(prev => ({
            ...prev,
            isOnline: true,
            isConnected: true,
            hasError: false,
            errorMessage: null,
          }));
        } else {
          console.warn('Error al habilitar red en Firestore:', error);
          setState(prev => ({
            ...prev,
            isOnline: true,
            isConnected: false,
            hasError: true,
            errorMessage: error.message,
          }));
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    const handleOffline = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
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
      } finally {
        isProcessingRef.current = false;
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
    if (db && navigator.onLine && !isProcessingRef.current) {
      isProcessingRef.current = true;
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
        // Ignorar errores de "Target ID already exists" ya que indican que la red ya está habilitada
        if (error.code === 'already-exists' || error.message?.includes('Target ID already exists')) {
          console.log('🔄 Firestore: Ya conectado');
          setState(prev => ({
            ...prev,
            isConnected: true,
            hasError: false,
            errorMessage: null,
          }));
        } else {
          console.warn('Error al reconectar Firestore:', error);
          setState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: error.message,
          }));
        }
      } finally {
        isProcessingRef.current = false;
      }
    }
  };

  return {
    ...state,
    reconnect,
  };
};