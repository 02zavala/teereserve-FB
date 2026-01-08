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
          // Verificar conectividad antes de importar
          if (!navigator.onLine) {
            console.log('📴 Analytics: Saltando inicialización (sin conexión)');
            return;
          }

          await import('@/lib/analytics');
          console.log('✅ Firebase Analytics inicializado');
        } catch (error: any) {
          // Manejar específicamente errores de fetch/network
          if (error?.message?.includes('Failed to fetch') || 
              error?.message?.includes('fetch') ||
              error?.name === 'TypeError' ||
              error?.code === 'MODULE_NOT_FOUND') {
            console.log('📴 Analytics: Módulo no disponible (modo offline o error de red)');
            return; // Silenciar estos errores
          }
          
          console.warn('⚠️ Error al inicializar Analytics:', error);
        }
      }
    };

    // Usar setTimeout para evitar bloqueos en el render
    const timeoutId = setTimeout(() => {
      initializeAnalytics().catch((error) => {
        // Capturar cualquier error no manejado
        console.log('📴 Analytics: Inicialización fallida silenciosamente');
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [firestoreConnection.isOnline]);

  // Manejar errores globales de Firebase de forma silenciosa
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || '';
      const errorStack = error?.stack || '';
      
      // Filtrar y suprimir errores conocidos de Firebase/Firestore
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('ERR_ABORTED') ||
          errorMessage.includes('net::ERR_ABORTED') ||
          (errorStack && (
            errorStack.includes('firebase') || 
            errorStack.includes('firestore') ||
            errorStack.includes('google') ||
            errorStack.includes('webchannel')
          ))) {
        // Suprimir completamente estos errores sin logging
        event.preventDefault();
        return;
      }
      
      // Suprimir específicamente errores de Google APIs
      if (errorMessage.includes('TypeError: Failed to fetch') && 
          (errorMessage.includes('apis.google.com') ||
           errorStack.includes('apis.google.com') ||
           errorStack.includes('__iframefcb') ||
           errorStack.includes('@firebase/auth') ||
           errorStack.includes('webpack-internal'))) {
        console.log('📴 Suprimido TypeError de Google APIs en promise rejection');
        event.preventDefault();
        return;
      }
      
      // Suprimir errores de Firebase Auth relacionados con Google APIs
      if (errorStack.includes('@firebase/auth') && 
          (errorMessage.includes('Failed to fetch') ||
           errorStack.includes('loadJS') ||
           errorStack.includes('_loadJS') ||
           errorStack.includes('cachedGApiLoader') ||
           errorStack.includes('_loadGapi') ||
           errorStack.includes('initAndGetManager'))) {
        console.log('🔐 Suprimido error de Firebase Auth Google APIs en promise rejection');
        event.preventDefault();
        return;
      }
    };

    // Interceptar errores globales de window
    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';
      
      // Suprimir errores de Firebase/Firestore
      if ((message.includes('net::ERR_ABORTED') || message.includes('ERR_ABORTED')) && 
          (filename.includes('firestore.googleapis.com') || 
           filename.includes('google.firestore') ||
           message.includes('webchannel') ||
           message.includes('firebase'))) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      
      // Suprimir errores de Failed to fetch relacionados con Firebase/Analytics
      if (message.includes('Failed to fetch') && 
          (filename.includes('FirebaseErrorHandler') || 
           filename.includes('analytics') ||
           message.includes('firebase'))) {
        console.log('📴 Error de fetch suprimido (modo offline)');
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Interceptar errores de consola para suprimir errores de Firebase
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      const lower = message.toLowerCase();
      const argText = args.map((a: any) => {
        if (typeof a === 'string') return a.toLowerCase();
        if (a && typeof a === 'object') {
          const m = (a.message || a.msg || '').toString().toLowerCase();
          return m;
        }
        return '';
      }).join(' ');
      
      // Suprimir errores del GlobalErrorHandler para evitar bucles infinitos
      if (message.includes('[GlobalErrorHandler]') && message.includes('Resource loading failed')) {
        return; // No mostrar estos errores para evitar bucles
      }
      
      // Suprimir errores específicos de Firebase/Firestore
      if ((message.includes('net::ERR_ABORTED') || message.includes('ERR_ABORTED')) && 
          (message.includes('firestore.googleapis.com') || 
           message.includes('google.firestore') ||
           message.includes('webchannel') ||
           message.includes('firebase'))) {
        return; // No mostrar estos errores
      }
      
      // Suprimir errores de Failed to fetch relacionados con Analytics/Firebase
      if (message.includes('Failed to fetch') && 
          (message.includes('FirebaseErrorHandler') || 
           message.includes('analytics') ||
           message.includes('firebase'))) {
        console.log('📴 Suprimido error de fetch de Firebase Analytics (modo offline)');
        return;
      }
      
      // Suprimir errores específicos de Google APIs (mejorado)
      if (message.includes('apis.google.com') || 
          message.includes('__iframefcb') ||
          message.includes('gapi.js') ||
          message.includes('https://apis.google.com/js/api.js')) {
        console.log('📴 Suprimido error de Google APIs (modo offline)');
        return;
      }
      
      // Suprimir errores de TypeError: Failed to fetch específicos de Google APIs
      if (message.includes('TypeError: Failed to fetch') && 
          (message.includes('apis.google.com') || 
           message.includes('__iframefcb') ||
           message.includes('webpack-internal') ||
           message.includes('@firebase/auth'))) {
        console.log('📴 Suprimido TypeError de Google APIs fetch');
        return;
      }
      
      // Suprimir errores de auth/internal-error relacionados con Google APIs
      if (message.includes('auth/internal-error') && 
          (message.includes('Firebase') || message.includes('loadJS'))) {
        console.log('🔐 Suprimido error interno de Firebase Auth (Google APIs no disponibles)');
        return;
      }
      
      // Suprimir errores de loadGapi y _loadJS
      if (message.includes('loadGapi') || 
          message.includes('_loadJS') || 
          message.includes('_openIframe') ||
          message.includes('cachedGApiLoader') ||
          message.includes('loadJS')) {
        console.log('🔐 Suprimido error de carga de Google APIs');
        return;
      }
      
      // Suprimir errores de TypeError relacionados con fetch de módulos
      if (message.includes('TypeError') && 
          (message.includes('Failed to fetch') || 
           message.includes('fetch') ||
           message.includes('import'))) {
        console.log('📴 Suprimido error de importación de módulo (modo offline)');
        return;
      }

      // Suprimir errores de Stripe Payment Element loaderror (ruido conocido en carga)
      if (((lower.includes('payment element') || lower.includes('paymentelement')) && lower.includes('loaderror')) || argText.includes('loaderror')) {
        console.log('💳 Suprimido PaymentElement loaderror');
        return;
      }

      // Suprimir errores de SDK de PayPal por client-id placeholder o fallo de script
      if (lower.includes('paypal.com/sdk/js') || lower.includes('sdk validation error') || lower.includes('client-id not recognized') || lower.includes('paypal') && lower.includes('failed to load')) {
        console.log('💰 Suprimido error de carga del SDK de PayPal');
        return;
      }
      
      // Suprimir errores de stack trace de Firebase
      if (message.includes('at h.send') && message.includes('webchannel')) {
        return;
      }
      
      // Suprimir errores de webpack relacionados con Firebase Auth (mejorado)
      if (message.includes('webpack-internal') && 
          (message.includes('@firebase/auth') || 
           message.includes('index-8e6e89cb.js') ||
           message.includes('app-pages-browser'))) {
        console.log('🔐 Suprimido error de webpack de Firebase Auth');
        return;
      }
      
      // Suprimir errores específicos de Firebase Auth en desarrollo (mejorado)
      if (message.includes('initAndGetManager') || 
          message.includes('_initialize') || 
          message.includes('cachedGApiLoader') ||
          message.includes('_loadGapi') ||
          message.includes('execute')) {
        console.log('🔐 Suprimido error de inicialización de Firebase Auth');
        return;
      }
      
      // Suprimir stack traces completos de webpack-internal con Firebase Auth
      if (message.includes('at eval (webpack-internal') && 
          (message.includes('@firebase/auth') || 
           message.includes('index-8e6e89cb.js'))) {
        console.log('🔐 Suprimido stack trace de webpack Firebase Auth');
        return;
      }
      
      // Mostrar otros errores normalmente
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Suprimir warnings de Firebase/Firestore
      if ((message.includes('net::ERR_ABORTED') || message.includes('ERR_ABORTED')) && 
          (message.includes('firestore.googleapis.com') || 
           message.includes('google.firestore') ||
           message.includes('webchannel') ||
           message.includes('firebase'))) {
        return; // No mostrar estos warnings
      }
      
      // Mostrar otros warnings normalmente
      originalConsoleWarn.apply(console, args);
    };

    // Escuchar errores globales y promesas rechazadas
    window.addEventListener('error', handleWindowError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', handleWindowError, true);
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
