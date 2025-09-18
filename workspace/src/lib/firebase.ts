
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

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
            console.warn(`Firebase Initialization Warning: Missing or invalid environment variable for '${key}'. Firebase services will be disabled.`);
            return false;
        }
        return true;
    });
};

const isConfigValid = validateFirebaseConfig(firebaseConfig);

// --- Firebase Initialization ---

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Promise<Analytics | null> | null = null;

if (isConfigValid) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        if (typeof window !== 'undefined') {
            analytics = isSupported().then(yes => (yes ? getAnalytics(app as FirebaseApp) : null));
        }
    } catch (e) {
         console.error("Error initializing Firebase:", e);
         // Set services to null on error to prevent usage
         app = null;
         db = null;
         auth = null;
         storage = null;
         analytics = null;
    }
} else {
    console.error(
        "Firebase services are disabled due to invalid configuration. Please check your .env.local file."
    );
}

export { db, auth, storage, app, analytics };
