// NUEVO: API endpoint para obtener métricas de reservas (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

// Tipos mínimos para procesar bookings
type Booking = {
  id?: string;
  createdAt?: string; // ISO
  date?: string | Date; // fecha del tee time, opcional
  userId?: string;
  userName?: string;
  userEmail?: string;
  isGuest?: boolean;
  guest?: { firstName?: string; lastName?: string; email?: string } | null;
  customerInfo?: { name?: string; email?: string } | null;
  status?: string;
  totalPrice?: number;
  courseName?: string;
  holes?: number;
};

// Verificación de acceso admin
async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyIdToken(token);
    return !!decoded.admin;
  } catch (error) {
    console.error('Error verifying admin access (bookings):', error);
    return false;
  }
}

// Utilidades
function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildPeriodLabel(days: number | null, from?: string, to?: string): string {
  if (from && to) return `Desde ${from} a ${to}`;
  if (days !== null) {
    return days === 365 ? 'Todo el tiempo (365 días)' : `Últimos ${days} días`;
  }
  return 'Rango personalizado';
}

function getCustomerKey(b: Booking): string {
  if (b.isGuest) {
    const email = b.guest?.email || b.userEmail || b.customerInfo?.email;
    return email ? `guest:${email}` : `guest:${b.id || Math.random().toString(36).slice(2)}`;
  }
  return b.userId ? `user:${b.userId}` : (b.userEmail ? `useremail:${b.userEmail}` : `user:${b.id || Math.random().toString(36).slice(2)}`);
}

function getCustomerName(b: Booking): string {
  if (b.isGuest) {
    const name = [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ').trim();
    if (name) return name;
    return b.customerInfo?.name || b.userName || 'Invitado';
  }
  return b.userName || b.customerInfo?.name || 'Cliente';
}

function getCustomerEmail(b: Booking): string | undefined {
  return b.userEmail || b.customerInfo?.email || b.guest?.email || undefined;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Filtros
    const daysParam = searchParams.get('days');
    const fromParam = searchParams.get('from'); // YYYY-MM-DD
    const toParam = searchParams.get('to'); // YYYY-MM-DD
    const statusParam = searchParams.get('status'); // opcional
    const courseIdParam = searchParams.get('courseId'); // opcional
    const limitParam = searchParams.get('limit');

    const limit = Math.min(parseInt(limitParam || '200', 10) || 200, 1000);

    // Calcular rango
    let fromISO: string | null = null;
    let toISO: string | null = null;
    let days: number | null = null;

    if (fromParam && toParam) {
      fromISO = fromParam;
      toISO = toParam;
    } else {
      days = parseInt(daysParam || '7', 10) || 7;
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - days + 1);
      const toDate = new Date(today);
      fromISO = toISODateString(fromDate);
      toISO = toISODateString(toDate);
    }

    const period = {
      days,
      from: fromISO,
      to: toISO,
      label: buildPeriodLabel(days, fromISO || undefined, toISO || undefined)
    };

    // Query de Firestore con fallback por compatibilidad de índices
    if (!db) {
      return NextResponse.json({ ok: false, error: 'Admin Firestore not initialized' }, { status: 500 });
    }
    const bookingsCol = db.collection('bookings');
    let bookings: Booking[] = [];

    try {
      let q = bookingsCol as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
      if (fromISO) q = q.where('createdAt', '>=', fromISO);
      if (toISO) q = q.where('createdAt', '<=', toISO);
      if (statusParam && statusParam !== 'all') q = q.where('status', '==', statusParam);
      if (courseIdParam && courseIdParam !== 'all') q = q.where('courseId', '==', courseIdParam);
      q = q.orderBy('createdAt', 'desc').limit(limit);
      const snap = await q.get();
      bookings = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Booking));
    } catch (qErr) {
      console.warn('Falling back to client-side filtering for bookings:', qErr);
      const snap = await bookingsCol.orderBy('createdAt', 'desc').limit(1000).get();
      const all = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      bookings = all.filter((b: any) => {
        const raw = b.createdAt;
        const created = typeof raw === 'string' ? raw : (raw?.toDate ? raw.toDate().toISOString() : '');
        const inRange = (!fromISO || created >= fromISO) && (!toISO || created <= toISO);
        const statusOk = !statusParam || statusParam === 'all' || b.status === statusParam;
        const courseOk = !courseIdParam || courseIdParam === 'all' || (b as any).courseId === courseIdParam;
        return inRange && statusOk && courseOk;
      }).slice(0, limit);
    }

    // Agregados
    const totalCount = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.totalPrice || 0) || 0), 0);
    const avgValue = totalCount > 0 ? totalRevenue / totalCount : 0;
    const statusDistribution: Record<string, number> = {};
    bookings.forEach(b => {
      const s = b.status || 'unknown';
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    });

    // Top clientes por reservas
    const customerMap: Record<string, { key: string; name: string; email?: string; count: number; totalAmount: number }> = {};
    bookings.forEach(b => {
      const key = getCustomerKey(b);
      if (!customerMap[key]) {
        customerMap[key] = { key, name: getCustomerName(b), email: getCustomerEmail(b), count: 0, totalAmount: 0 };
      }
      customerMap[key].count += 1;
      customerMap[key].totalAmount += Number(b.totalPrice || 0) || 0;
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => (b.count - a.count) || (b.totalAmount - a.totalAmount))
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      period,
      aggregated: { totalCount, totalRevenue, avgValue, statusDistribution },
      topCustomers,
      bookings,
    });
  } catch (error: any) {
    console.error('Error in booking-metrics endpoint:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal error' }, { status: 500 });
  }
}
