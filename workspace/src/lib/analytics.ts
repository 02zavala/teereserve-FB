/**
 * Configuración de Firebase Analytics y Google Analytics 4
 * Para TeeReserve - Sistema de Reservas de Golf
 */

import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { app } from './firebase';
import { logger } from './logger';

let analytics: Analytics | null = null;
let analyticsInitialized = false;
let analyticsError: string | null = null;

// Inicializar Analytics solo en el cliente
if (typeof window !== 'undefined' && app) {
  try {
    analytics = getAnalytics(app);
    analyticsInitialized = true;
    console.log('✅ Firebase Analytics inicializado');
    logger.info('Firebase Analytics initialized successfully', 'analytics');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    analyticsError = errorMessage;
    console.error('❌ Error inicializando Firebase Analytics:', error);
    logger.error('Failed to initialize Firebase Analytics', error as Error, 'analytics', {
      fallbackAvailable: true,
      networkStatus: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
    });
  }
}

// Función helper para manejar errores de tracking
const handleTrackingError = (eventName: string, error: unknown, data?: any) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown tracking error';
  logger.warn(`Analytics tracking failed for event: ${eventName}`, 'analytics', {
    error: errorMessage,
    eventData: data,
    analyticsAvailable: !!analytics,
    networkStatus: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline',
    fallbackLogging: true
  });
  
  // Fallback: log to console for debugging
  console.warn(`📊 Analytics fallback - Event: ${eventName}`, data);
};

// Eventos personalizados para TeeReserve
export const trackEvent = {
  // Eventos de reservas
  reservationStarted: (courseId: string, date: string) => {
    const eventData = {
      course_id: courseId,
      reservation_date: date,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'reservation_started', eventData);
      } else {
        handleTrackingError('reservation_started', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('reservation_started', error, eventData);
    }
  },

  reservationCompleted: (reservationId: string, courseId: string, amount: number, paymentMethod: string) => {
    const eventData = {
      transaction_id: reservationId,
      value: amount,
      currency: 'USD',
      items: [{
        item_id: courseId,
        item_name: 'Golf Reservation',
        category: 'Golf Course',
        quantity: 1,
        price: amount
      }],
      payment_method: paymentMethod
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'purchase', eventData);
      } else {
        handleTrackingError('purchase', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('purchase', error, eventData);
    }
  },

  reservationCancelled: (reservationId: string, reason: string) => {
    const eventData = {
      reservation_id: reservationId,
      cancellation_reason: reason,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'reservation_cancelled', eventData);
      } else {
        handleTrackingError('reservation_cancelled', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('reservation_cancelled', error, eventData);
    }
  },

  // Eventos de navegación
  courseViewed: (courseId: string, courseName: string) => {
    const eventData = {
      item_id: courseId,
      item_name: courseName,
      item_category: 'Golf Course',
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'view_item', eventData);
      } else {
        handleTrackingError('view_item', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('view_item', error, eventData);
    }
  },

  searchPerformed: (searchTerm: string, resultsCount: number) => {
    const eventData = {
      search_term: searchTerm,
      results_count: resultsCount,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'search', eventData);
      } else {
        handleTrackingError('search', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('search', error, eventData);
    }
  },

  // Eventos de usuario
  userRegistered: (method: string) => {
    const eventData = {
      method: method,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'sign_up', eventData);
      } else {
        handleTrackingError('sign_up', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('sign_up', error, eventData);
    }
  },

  userLoggedIn: (method: string) => {
    const eventData = {
      method: method,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'login', eventData);
      } else {
        handleTrackingError('login', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('login', error, eventData);
    }
  },

  // Eventos de engagement
  contactFormSubmitted: (formType: string) => {
    const eventData = {
      form_type: formType,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'generate_lead', eventData);
      } else {
        handleTrackingError('generate_lead', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('generate_lead', error, eventData);
    }
  },

  newsletterSubscribed: (source: string) => {
    const eventData = {
      source: source,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'newsletter_subscription', eventData);
      } else {
        handleTrackingError('newsletter_subscription', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('newsletter_subscription', error, eventData);
    }
  },

  // Exit-intent interactions
  exitIntentModalOpened: () => {
    const eventData = { timestamp: new Date().toISOString() };
    try {
      if (analytics) {
        logEvent(analytics, 'exit_intent_opened', eventData);
      } else {
        handleTrackingError('exit_intent_opened', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('exit_intent_opened', error, eventData);
    }
  },

  exitIntentLeadSubmitted: (hasEmail: boolean) => {
    const eventData = { has_email: hasEmail, timestamp: new Date().toISOString() };
    try {
      if (analytics) {
        logEvent(analytics, 'exit_intent_submitted', eventData);
      } else {
        handleTrackingError('exit_intent_submitted', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('exit_intent_submitted', error, eventData);
    }
  },

  exitIntentLeadSuccess: () => {
    const eventData = { timestamp: new Date().toISOString() };
    try {
      if (analytics) {
        logEvent(analytics, 'exit_intent_success', eventData);
      } else {
        handleTrackingError('exit_intent_success', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('exit_intent_success', error, eventData);
    }
  },

  exitIntentLeadFailed: (errorMessage: string) => {
    const eventData = { error: errorMessage, timestamp: new Date().toISOString() };
    try {
      if (analytics) {
        logEvent(analytics, 'exit_intent_failed', eventData);
      } else {
        handleTrackingError('exit_intent_failed', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('exit_intent_failed', error, eventData);
    }
  },

  // Eventos de error
  errorOccurred: (errorType: string, errorMessage: string, page: string) => {
    const eventData = {
      description: `${errorType}: ${errorMessage}`,
      fatal: false,
      page: page,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'exception', eventData);
      } else {
        handleTrackingError('exception', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('exception', error, eventData);
    }
  },

  // Eventos de performance
  pageLoadTime: (page: string, loadTime: number) => {
    const eventData = {
      page: page,
      load_time_ms: loadTime,
      timestamp: new Date().toISOString()
    };
    
    try {
      if (analytics) {
        logEvent(analytics, 'page_load_time', eventData);
      } else {
        handleTrackingError('page_load_time', new Error('Analytics not available'), eventData);
      }
    } catch (error) {
      handleTrackingError('page_load_time', error, eventData);
    }
  }
};

// Configurar propiedades de usuario
export const setUserProperties = {
  setUserType: (userType: 'guest' | 'registered' | 'premium') => {
    if (analytics) {
      // En Firebase Analytics, las propiedades de usuario se configuran diferente
      logEvent(analytics, 'user_type_set', {
        user_type: userType
      });
    }
  },

  setUserLocation: (country: string, region: string) => {
    if (analytics) {
      logEvent(analytics, 'user_location_set', {
        country: country,
        region: region
      });
    }
  },

  setPreferredLanguage: (language: string) => {
    if (analytics) {
      logEvent(analytics, 'language_preference_set', {
        language: language
      });
    }
  }
};

// Configuración de Google Analytics 4 (gtag)
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Estado de Google Analytics
let ga4Initialized = false;
let ga4Error: string | null = null;

// Inicializar Google Analytics 4
export const initGA4 = (nonce?: string) => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID && process.env.NEXT_PUBLIC_DISABLE_ANALYTICS !== 'true') {
     try {
       // Verificar si ya existe el script
       const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
       if (existingScript) {
         console.log('✅ Google Analytics script ya cargado');
         ga4Initialized = true;
         return;
       }

       // Verificar conectividad antes de cargar
       if (typeof window !== 'undefined' && !navigator.onLine) {
         const offlineError = 'Cannot initialize GA4: device is offline';
         ga4Error = offlineError;
         logger.warn(offlineError, 'analytics', {
           fallbackAvailable: true,
           retryOnReconnect: true
         });
         return;
       }

       // Configurar dataLayer primero
       window.dataLayer = window.dataLayer || [];
       window.gtag = function() {
         window.dataLayer.push(arguments);
       };

       // Cargar gtag script con manejo de errores mejorado
       const script = document.createElement('script');
       if (nonce) {
         script.setAttribute('nonce', nonce);
       }
       script.async = true;
       script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}`;
       
       // Timeout para evitar bloqueos prolongados
       const timeout = setTimeout(() => {
         const timeoutError = 'Google Analytics script loading timeout';
         ga4Error = timeoutError;
         console.warn('⚠️ Google Analytics: Timeout al cargar el script');
         logger.warn(timeoutError, 'analytics', {
           timeout: '10s',
           fallbackAvailable: true,
           networkStatus: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
         });
         script.remove();
       }, 10000); // 10 segundos timeout
       
       script.onload = () => {
         clearTimeout(timeout);
         try {
           // Configurar GA4 después de que el script se cargue
           window.gtag('js', new Date());
           window.gtag('config', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, {
             page_title: 'TeeReserve - Golf Course Reservations',
             page_location: window.location.href,
             send_page_view: true,
             // Configuraciones de privacidad
             anonymize_ip: true,
             allow_google_signals: false,
             allow_ad_personalization_signals: false,
             // Configuraciones para desarrollo
             debug_mode: process.env.NODE_ENV === 'development',
             transport_type: 'beacon'
           });
           ga4Initialized = true;
           ga4Error = null;
           console.log('✅ Google Analytics 4 inicializado correctamente');
           logger.info('Google Analytics 4 initialized successfully', 'analytics');
         } catch (configError) {
           const errorMessage = configError instanceof Error ? configError.message : 'Unknown config error';
           ga4Error = errorMessage;
           console.warn('⚠️ Error configurando Google Analytics:', configError);
           logger.error('Failed to configure Google Analytics', configError as Error, 'analytics', {
             fallbackAvailable: true
           });
         }
       };

       script.onerror = (error) => {
         clearTimeout(timeout);
         const errorMessage = 'Failed to load Google Analytics script';
         ga4Error = errorMessage;
         console.warn('⚠️ Error cargando Google Analytics - La aplicación continuará funcionando normalmente:', error);
         logger.error(errorMessage, new Error(errorMessage), 'analytics', {
           networkStatus: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline',
           fallbackAvailable: true,
           scriptSrc: script.src
         });
         // Remover el script fallido para evitar errores adicionales
         script.remove();
         // No bloquear la aplicación si GA4 falla
       };

       // Agregar el script al head con manejo de errores
       try {
         document.head.appendChild(script);
       } catch (appendError) {
         clearTimeout(timeout);
         const errorMessage = appendError instanceof Error ? appendError.message : 'Unknown DOM error';
         ga4Error = errorMessage;
         console.warn('⚠️ Error agregando script de Google Analytics al DOM:', appendError);
         logger.error('Failed to append Google Analytics script to DOM', appendError as Error, 'analytics', {
           fallbackAvailable: true
         });
       }
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
       ga4Error = errorMessage;
       console.warn('⚠️ Error inicializando Google Analytics - La aplicación continuará funcionando normalmente:', error);
       logger.error('Failed to initialize Google Analytics', error as Error, 'analytics', {
         fallbackAvailable: true,
         networkStatus: typeof window !== 'undefined' && navigator?.onLine ? 'online' : 'offline'
       });
     }
   } else {
     console.log('ℹ️ Google Analytics no inicializado: deshabilitado o falta MEASUREMENT_ID');
   }
};

// Hook para usar en componentes React
export const useAnalytics = () => {
  return {
    analytics,
    trackEvent,
    setUserProperties,
    isInitialized: analytics !== null,
    // Estado de Firebase Analytics
    firebaseAnalytics: {
      initialized: analyticsInitialized,
      error: analyticsError,
      available: !!analytics
    },
    // Estado de Google Analytics
    googleAnalytics: {
      initialized: ga4Initialized,
      error: ga4Error,
      available: typeof window !== 'undefined' && !!window.gtag
    },
    // Estado general
    hasAnyAnalytics: analytics !== null || (typeof window !== 'undefined' && !!window.gtag),
    networkStatus: typeof window !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'unknown'
  };
};

export default analytics;