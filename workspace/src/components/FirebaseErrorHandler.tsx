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
          const errorMessage = error?.message && typeof error.message === 'string' ? error.message : '';
          
          if (errorMessage.includes('Failed to fetch') || 
              errorMessage.includes('fetch') ||
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
      const errorMessage = (error?.message && typeof error.message === 'string') ? error.message : '';
      const errorStack = (error?.stack && typeof error.stack === 'string') ? error.stack : '';
      
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
      const message = (event && typeof event.message === 'string') ? event.message : '';
      const filename = (event && typeof event.filename === 'string') ? event.filename : '';
      
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
      try {
        if (!args || args.length === 0) return;

        // Construcción segura de strings para análisis
        let message = '';
        try {
            message = args.join(' ');
        } catch (e) {
            message = '';
        }

        const lower = typeof message === 'string' ? message.toLowerCase() : String(message).toLowerCase();
        
        let argText = '';
        try {
            argText = args.map((a: any) => {
                if (!a) return '';
                if (typeof a === 'string') return a.toLowerCase();
                if (typeof a === 'object') {
                try {
                    const msg = a.message || a.msg || '';
                    return typeof msg === 'string' ? msg.toLowerCase() : String(msg).toLowerCase();
                } catch (e) {
                    return '';
                }
                }
                return String(a).toLowerCase();
            }).join(' ');
        } catch (e) {
            argText = '';
        }
        
        // Verificación extra de seguridad
        if (!lower || typeof lower.includes !== 'function') {
             try {
                originalConsoleError.apply(console, args);
             } catch (e) {}
             return;
        }

        // Suprimir errores del GlobalErrorHandler para evitar bucles infinitos
        if (lower.includes('[globalerrorhandler]') && lower.includes('resource loading failed')) {
          return; 
        }
        
        // Suprimir errores específicos de Firebase/Firestore
        if ((lower.includes('net::err_aborted') || lower.includes('err_aborted')) && 
            (lower.includes('firestore.googleapis.com') || 
             lower.includes('google.firestore') ||
             lower.includes('webchannel') ||
             lower.includes('firebase'))) {
          return; 
        }
        
        // Suprimir errores de Failed to fetch relacionados con Analytics/Firebase
        if (lower.includes('failed to fetch') && 
            (lower.includes('firebaseerrorhandler') || 
             lower.includes('analytics') ||
             lower.includes('firebase'))) {
          console.log('📴 Suprimido error de fetch de Firebase Analytics (modo offline)');
          return;
        }
        
        // Suprimir errores específicos de Google APIs (mejorado)
        if (lower.includes('apis.google.com') || 
            lower.includes('__iframefcb') ||
            lower.includes('gapi.js') ||
            lower.includes('https://apis.google.com/js/api.js')) {
          console.log('📴 Suprimido error de Google APIs (modo offline)');
          return;
        }
        
        // Suprimir errores de TypeError: Failed to fetch específicos de Google APIs
        if (lower.includes('typeerror: failed to fetch') && 
            (lower.includes('apis.google.com') || 
             lower.includes('__iframefcb') ||
             lower.includes('webpack-internal') ||
             lower.includes('@firebase/auth'))) {
          console.log('📴 Suprimido TypeError de Google APIs fetch');
          return;
        }
        
        // Suprimir errores de auth/internal-error relacionados con Google APIs
        if (lower.includes('auth/internal-error') && 
            (lower.includes('firebase') || lower.includes('loadjs'))) {
          console.log('🔐 Suprimido error interno de Firebase Auth (Google APIs no disponibles)');
          return;
        }
        
        // Suprimir errores de loadGapi y _loadJS
        if (lower.includes('loadgapi') || 
            lower.includes('_loadjs') || 
            lower.includes('_openiframe') ||
            lower.includes('cachedgapiloader') ||
            lower.includes('loadjs')) {
          console.log('🔐 Suprimido error de carga de Google APIs');
          return;
        }
        
        // Suprimir errores de TypeError relacionados con fetch de módulos
        if (lower.includes('typeerror') && 
            (lower.includes('failed to fetch') || 
             lower.includes('fetch') ||
             lower.includes('import'))) {
          console.log('📴 Suprimido error de importación de módulo (modo offline)');
          return;
        }

        // Suprimir errores de Stripe Payment Element loaderror
        if (((lower.includes('payment element') || lower.includes('paymentelement')) && lower.includes('loaderror')) || (argText && argText.includes('loaderror'))) {
          console.log('💳 Suprimido PaymentElement loaderror');
          return;
        }

        // Suprimir errores de SDK de PayPal
        if (lower.includes('paypal.com/sdk/js') || lower.includes('sdk validation error') || lower.includes('client-id not recognized') || (lower.includes('paypal') && lower.includes('failed to load'))) {
          console.log('💰 Suprimido error de carga del SDK de PayPal');
          return;
        }
        
        // Suprimir errores de stack trace de Firebase
        if (lower.includes('at h.send') && lower.includes('webchannel')) {
          return;
        }
        
        // Suprimir errores de webpack relacionados con Firebase Auth
        if (lower.includes('webpack-internal') && 
            (lower.includes('@firebase/auth') || 
             lower.includes('index-8e6e89cb.js') ||
             lower.includes('app-pages-browser'))) {
          console.log('🔐 Suprimido error de webpack de Firebase Auth');
          return;
        }
        
        // Suprimir errores específicos de Firebase Auth en desarrollo
        if (lower.includes('initandgetmanager') || 
            lower.includes('_initialize') || 
            lower.includes('cachedgapiloader') ||
            lower.includes('_loadgapi') ||
            lower.includes('execute')) {
          console.log('🔐 Suprimido error de inicialización de Firebase Auth');
          return;
        }
        
        // Suprimir stack traces completos de webpack-internal con Firebase Auth
        if (lower.includes('at eval (webpack-internal') && 
            (lower.includes('@firebase/auth') || 
             lower.includes('index-8e6e89cb.js'))) {
          console.log('🔐 Suprimido stack trace de webpack Firebase Auth');
          return;
        }
        
        // Mostrar otros errores normalmente
        try {
          originalConsoleError.apply(console, args);
        } catch (e) {
          // Fallback silencioso
        }
      } catch (mainError) {
        // Si falla nuestra lógica de filtrado, intentar loguear el error original sin filtrar
        try {
            originalConsoleError.apply(console, args);
        } catch (e) {}
      }
    };
    
    console.warn = (...args: any[]) => {
      if (!args || args.length === 0) return;
      
      const message = args.join(' ');
      const lower = typeof message === 'string' ? message.toLowerCase() : '';
      
      // Suprimir warnings de Firebase/Firestore
      if ((lower.includes('net::err_aborted') || lower.includes('err_aborted')) && 
          (lower.includes('firestore.googleapis.com') || 
           lower.includes('google.firestore') ||
           lower.includes('webchannel') ||
           lower.includes('firebase'))) {
        return; // No mostrar estos warnings
      }
      
      // Mostrar otros warnings normalmente
      try {
        originalConsoleWarn.apply(console, args);
      } catch (e) {
        // Silenciar errores en warn
      }
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
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
