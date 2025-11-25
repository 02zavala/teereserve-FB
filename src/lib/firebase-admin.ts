import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.warn('Firebase Admin SDK env vars not set; admin services disabled in this environment');
    } else {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

try {
  if (getApps().length) {
    auth = getAuth();
    db = getFirestore();
    storage = getStorage();
  }
} catch (error) {
  console.warn('Firebase Admin services unavailable:', error);
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };

// Helper: verify ID token and infer admin privileges from custom claim or Firestore role
export async function verifyIdToken(token: string): Promise<{ uid: string; admin: boolean; [key: string]: any }> {
  try {
    if (!auth) throw new Error('Firebase Admin Auth not initialized');
    const decoded = await auth.verifyIdToken(token);

    // Prefer custom claim if present
    let isAdmin = typeof (decoded as any).admin === 'boolean' ? (decoded as any).admin : false;

    // Fallback to user role stored in Firestore
    if (!isAdmin) {
      try {
        if (!db) throw new Error('Firebase Admin Firestore not initialized');
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const role = (userDoc.data()?.role || '').toLowerCase();
        isAdmin = role === 'admin' || role === 'superadmin';
      } catch (roleErr) {
        console.warn('verifyIdToken: unable to read user role from Firestore', roleErr);
      }
    }

    return { ...decoded, admin: isAdmin };
  } catch (error) {
    console.error('verifyIdToken: failed to verify token', error);
    throw error;
  }
}