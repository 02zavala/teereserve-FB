
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, initializeFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getDatabase, Database, connectDatabaseEmulator } from "firebase/database";
import { getMessaging, Messaging, isSupported as isMessagingSupported } from "firebase/messaging";

// --- Configuration and Validation ---

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const validateFirebaseConfig = (config: FirebaseOptions): boolean => {
    return Object.entries(config).every(([key, value]) => {
        if (!value || typeof value !== 'string' || value.includes('your_') || value.includes('YOUR_')) {
            console.warn(`
              *****************************************************************
              * Firebase Initialization Warning:                              *
              * Missing or placeholder value for environment variable:        *
              * NEXT_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}
              *                                                               *
              * Firebase services will be disabled.                           *
              * Please ensure your .env.local file is correctly configured.   *
              *****************************************************************
            `);
            return false;
        }
        return true;
    });
};

const isConfigValid = validateFirebaseConfig(firebaseConfig);

// --- Firebase Initialization ---

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let realtimeDb: Database | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Promise<Analytics | null> | null = null;
let messaging: Promise<Messaging | null> | null = null;

if (isConfigValid) {
    try {
        // Evitar doble inicialización
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        
        // Configurar Firestore con transporte estable y persistencia offline
        try {
            db = initializeFirestore(app, {
                experimentalAutoDetectLongPolling: true,
                // Configuración para mejor manejo offline
                localCache: {
                    kind: 'persistent',
                    tabManager: 'optimistic',
                    cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
                },
            });
            
            // Nota: El manejo de conectividad se realiza a través del hook useFirestoreConnection
            // para evitar conflictos y el error "Target ID already exists"
            
        } catch (error: any) {
            // Si ya está inicializado, usar la instancia existente
            if (error.code === 'failed-precondition') {
                db = getFirestore(app);
                console.log('Using existing Firestore instance');
            } else {
                console.error('Error initializing Firestore:', error);
                // Intentar con configuración básica como fallback
                try {
                    db = getFirestore(app);
                    console.log('Firestore initialized with basic configuration');
                } catch (fallbackError) {
                    console.error('Failed to initialize Firestore with fallback:', fallbackError);
                    throw fallbackError;
                }
            }
        }
        
        realtimeDb = getDatabase(app);
        
        // Configurar Auth con manejo mejorado de errores
        try {
            auth = getAuth(app);
            
            // Configurar manejo de errores específicos para Google APIs
            if (typeof window !== 'undefined') {
                // Función para verificar conectividad a Google APIs
                const checkGoogleApisConnectivity = async (): Promise<boolean> => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout (más rápido)
                        
                        const response = await fetch('https://apis.google.com/js/api.js', {
                            method: 'HEAD',
                            signal: controller.signal,
                            cache: 'no-cache',
                            mode: 'no-cors' // Evita algunos errores CORS
                        });
                        
                        clearTimeout(timeoutId);
                        return response.ok;
                    } catch (error) {
                        // Silenciar errores específicos de red para reducir ruido en consola
                        if (error instanceof Error) {
                            const errorMsg = error.message.toLowerCase();
                            if (errorMsg.includes('aborted') || 
                                errorMsg.includes('network') || 
                                errorMsg.includes('fetch')) {
                                // Solo log en desarrollo para debugging
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('🔐 Google APIs: Conectividad limitada (modo offline)');
                                }
                                return false;
                            }
                        }
                        console.log('🔐 Google APIs no disponibles:', error instanceof Error ? error.message : 'Unknown error');
                        return false;
                    }
                };
                
                // Verificar conectividad antes de inicializar Google APIs
                const handleAuthErrors = async () => {
                    const isGoogleApisAvailable = await checkGoogleApisConnectivity();
                    
                    if (!isGoogleApisAvailable) {
                        console.log('🔐 Auth: Google APIs no disponibles - modo offline');
                        return;
                    }
                    
                    // Interceptar errores de Google APIs con retry
                    const originalFetch = window.fetch;
                    window.fetch = async (...args) => {
                        try {
                            return await originalFetch(...args);
                        } catch (error: any) {
                            // Manejar errores específicos de Google APIs
                            if (args[0] && typeof args[0] === 'string' && 
                                args[0].includes('apis.google.com')) {
                                console.log('🔐 Google APIs fetch failed (retrying in offline mode)');
                                
                                // Intentar una vez más después de un breve delay
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                try {
                                    return await originalFetch(...args);
                                } catch (retryError) {
                                    console.log('🔐 Google APIs retry failed - operating in offline mode');
                                    throw new Error('Network unavailable for Google APIs');
                                }
                            }
                            throw error;
                        }
                    };
                };
                
                // Solo aplicar interceptores si estamos online
                if (navigator.onLine) {
                    handleAuthErrors().catch(error => {
                        console.log('🔐 Auth error handling setup failed:', error.message);
                    });
                }
                
                // Manejar cambios de conectividad para Auth
                const handleAuthOnline = async () => {
                    console.log('🔐 Auth: Conectividad restaurada');
                    
                    // Esperar un poco para que la red se estabilice
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    try {
                        await handleAuthErrors();
                    } catch (error) {
                        console.log('🔐 Auth: Error al restaurar conectividad:', error instanceof Error ? error.message : 'Unknown error');
                    }
                };
                
                const handleAuthOffline = () => {
                    console.log('🔐 Auth: Modo offline - Google Sign-In deshabilitado');
                };
                
                window.addEventListener('online', handleAuthOnline);
                window.addEventListener('offline', handleAuthOffline);
            }
        } catch (authError) {
            console.error('Error initializing Firebase Auth:', authError);
            auth = null;
        }
        
        storage = getStorage(app);
        
        // Log de conexión para debugging
        if (typeof window !== 'undefined' && db) {
            console.log('Firestore initialized with stable transport');
        }
        
        if (typeof window !== 'undefined') {
            analytics = isSupported().then(async (yes) => {
                if (yes) {
                    try {
                        // En desarrollo, deshabilitar Analytics si hay problemas de red
                        if (process.env.NODE_ENV === 'development' && !navigator.onLine) {
                            console.warn('Firebase Analytics disabled in development (offline)');
                            return null;
                        }
                        return getAnalytics(app as FirebaseApp);
                    } catch (error) {
                        console.warn('Failed to initialize Firebase Analytics (script loading failed):', error);
                        return null;
                    }
                }
                return null;
            }).catch((error) => {
                console.warn('Analytics support check failed:', error);
                return null;
            });
            
            messaging = isMessagingSupported().then(async (yes) => {
                if (yes) {
                    try {
                        return getMessaging(app as FirebaseApp);
                    } catch (error) {
                        console.warn('Failed to initialize Firebase Messaging:', error);
                        return null;
                    }
                }
                return null;
            }).catch((error) => {
                console.warn('Messaging support check failed:', error);
                return null;
            });
        }
    } catch (e) {
         console.error("Error initializing Firebase:", e);
         // Set services to null on error to prevent usage
         app = null;
         db = null;
         auth = null;
         storage = null;
         analytics = null;
         messaging = null;
    }
} else {
    console.error(
        "Firebase services are disabled due to invalid or missing configuration. Please check your .env.local file and the console warnings above."
    );
}

export { db, realtimeDb, auth, storage, app, analytics, messaging };
