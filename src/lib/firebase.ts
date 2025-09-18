
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
            
            // Configurar manejo de conectividad
            if (typeof window !== 'undefined') {
                // Manejar cambios de conectividad
                const handleOnline = async () => {
                    try {
                        await enableNetwork(db!);
                        console.log('🌐 Firestore: Conectividad restaurada');
                    } catch (error) {
                        console.warn('Error al habilitar red en Firestore:', error);
                    }
                };
                
                const handleOffline = async () => {
                    try {
                        await disableNetwork(db!);
                        console.log('📴 Firestore: Modo offline activado');
                    } catch (error) {
                        console.warn('Error al deshabilitar red en Firestore:', error);
                    }
                };
                
                // Escuchar cambios de conectividad
                window.addEventListener('online', handleOnline);
                window.addEventListener('offline', handleOffline);
                
                // Verificar estado inicial
                if (!navigator.onLine) {
                    handleOffline();
                }
            }
            
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
        auth = getAuth(app);
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
