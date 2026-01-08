import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { i18n } from '@/i18n-config';
import { auth, db } from '@/lib/firebase-admin';
import { z } from 'zod';

// Helper function to check if user is admin (same approach as pricing save route)
async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  try {
    if (!auth || !db) {
      console.error('Firebase Admin SDK not initialized');
      return false;
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const role = (userData?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
  } catch (error) {
    console.error('Error verifying admin status (revalidate):', error);
    return false;
  }
}

const bodySchema = z.object({
  courseId: z.string().optional(),
  paths: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isUserAdmin = await isAdmin(authHeader);
    if (!isUserAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, paths } = bodySchema.parse(body);

    // Determine paths to revalidate
    const targetPaths = new Set<string>();

    // Allow explicit paths from caller
    (paths || []).forEach(p => targetPaths.add(p));

    // Default public pages that depend on courses/prices
    for (const locale of i18n.locales) {
      targetPaths.add(`/${locale}`); // Home page shows featured courses
      targetPaths.add(`/${locale}/courses`); // Courses listing
      if (courseId) {
        targetPaths.add(`/${locale}/courses/${courseId}`); // Course detail
      }
    }

    // Trigger revalidation
    const revalidated: string[] = [];
    targetPaths.forEach(p => {
      try {
        revalidatePath(p);
        revalidated.push(p);
      } catch (err) {
        console.warn('Failed to revalidate path', p, err);
      }
    });

    return NextResponse.json({ ok: true, revalidated });
  } catch (error: any) {
    console.error('Error revalidating paths:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
