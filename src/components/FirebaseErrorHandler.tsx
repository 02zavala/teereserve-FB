"use client";

import React, { useEffect, useState } from 'react';
import { useFirestoreConnection } from '@/hooks/useFirestoreConnection';

interface FirebaseErrorHandlerProps {
  children: React.ReactNode;
}

export const FirebaseErrorHandler: React.FC<FirebaseErrorHandlerProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const firestoreConnection = useFirestoreConnection();

  useEffect(() => {
    // Inicializar Analytics si hay conectividad
    const initializeAnalytics = async () => {
      if (firestoreConnection.isOnline && typeof window !== 'undefined') {
        try {
          const { analytics } = await import('@/lib/analytics');
          console.log('✅ Firebase Analytics inicializado');
        } catch (error) {
          console.warn('⚠️ Error al inicializar Analytics:', error);
        }
      }
    };

    initializeAnalytics();
  }, [firestoreConnection.isOnline]);

  // Manejar errores globales de fetch relacionados con Firebase
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Filtrar errores conocidos de Firebase
      if (error?.message?.includes('Failed to fetch') && 
          (error?.stack?.includes('firebase') || error?.stack?.includes('google'))) {
        console.warn('🔄 Firebase fetch error handled:', error.message);
        event.preventDefault();
        return;
      }
    };

    const handleFetchError = (originalFetch: typeof fetch) => {
      return async (...args: Parameters<typeof fetch>) => {
        try {
          return await originalFetch(...args);
        } catch (error: any) {
          // Manejar errores específicos de Firebase
          if (error?.message?.includes('Failed to fetch') && 
              args[0]?.toString().includes('google')) {
            console.warn('🔄 Firebase API call failed, continuing offline:', error.message);
            throw error; // Re-throw para que Firebase maneje el offline
          }
          throw error;
        }
      };
    };

    // Interceptar fetch global
    const originalFetch = window.fetch;
    window.fetch = handleFetchError(originalFetch);

    // Escuchar promesas rechazadas
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Mostrar estado de conexión si hay problemas
  if (firestoreConnection.hasError && firestoreConnection.errorMessage !== 'Operando en modo offline') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Problema de Conectividad
          </h2>
          <p className="text-gray-600 mb-6">
            {firestoreConnection.errorMessage || 'Hay problemas para conectar con los servicios.'}
          </p>
          <div className="space-y-4">
            <button
              onClick={firestoreConnection.reconnect}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-4"
            >
              Reconectar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Recargar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Indicador de estado de conexión */}
      {!firestoreConnection.isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          📴 Modo offline - Los datos se sincronizarán cuando se restaure la conexión
        </div>
      )}
      {children}
    </>
  );
};

export default FirebaseErrorHandler;