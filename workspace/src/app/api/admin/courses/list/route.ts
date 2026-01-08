import { NextRequest, NextResponse } from 'next/server';
import { db, verifyIdToken } from '@/lib/firebase-admin';
import { initialCourses } from '@/lib/data';

type CourseSummary = { id: string; name: string };

async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyIdToken(token);
    return !!decoded && (!!(decoded as any).admin || (decoded as any).role === 'admin' || (decoded as any).role === 'superadmin');
  } catch (error) {
    console.error('Error verifying admin for courses list:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const isUserAdmin = await isAdmin(request);
    if (!isUserAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const map = new Map<string, CourseSummary>();

    // Cargar cursos estáticos
    initialCourses.forEach(c => {
      map.set(c.id, { id: c.id, name: c.name });
    });

    // Cargar cursos dinámicos desde Firestore (admin SDK)
    try {
      if (!db) throw new Error('Admin Firestore not initialized');
      const snapshot = await db.collection('courses').get();
      snapshot.docs.forEach(doc => {
        const data = doc.data() || {} as any;
        const id = doc.id;
        const name = data.name || id;
        map.set(id, { id, name });
      });
    } catch (err) {
      console.warn('No se pudieron cargar cursos desde Firestore:', err);
    }

    const courses = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ ok: true, courses, count: courses.length });
  } catch (error: any) {
    console.error('Error in admin courses list:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
