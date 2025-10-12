import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('Missing Firebase Admin SDK environment variables');
      throw new Error('Firebase Admin SDK not configured');
    }
    
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export const auth = getAuth();
export const db = getFirestore();

// Helper: verify ID token and infer admin privileges from custom claim or Firestore role
export async function verifyIdToken(token: string): Promise<{ uid: string; admin: boolean; [key: string]: any }> {
  try {
    const decoded = await auth.verifyIdToken(token);

    // Prefer custom claim if present
    let isAdmin = typeof (decoded as any).admin === 'boolean' ? (decoded as any).admin : false;

    // Fallback to user role stored in Firestore
    if (!isAdmin) {
      try {
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