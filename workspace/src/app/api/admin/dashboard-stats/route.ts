// API: Admin Dashboard Stats (server-side aggregates)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { verifyIdToken } from '@/lib/firebase-admin';
import { collection, getDocs, query, where, orderBy, limit as fsLimit, getCountFromServer } from 'firebase/firestore';

// Minimal Booking type for aggregation
type Booking = {
  id?: string;
  createdAt?: string; // ISO
  date?: string | Date;
  status?: string;
  totalPrice?: number;
  holes?: number;
  courseId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  isGuest?: boolean;
  guest?: { firstName?: string; lastName?: string; email?: string } | null;
  customerInfo?: { name?: string; email?: string } | null;
};

async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyIdToken(token);
    return !!decoded.admin;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
}

function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helpers to identify customers (reused from booking-metrics)
function getCustomerKey(b: Booking): string {
  if (b.isGuest) {
    const email = (b.guest && b.guest.email) || b.userEmail || (b.customerInfo && b.customerInfo.email);
    return email ? `guest:${email}` : `guest:${b.id || Math.random().toString(36).slice(2)}`;
  }
  return b.userId ? `user:${b.userId}` : (b.userEmail ? `useremail:${b.userEmail}` : `user:${b.id || Math.random().toString(36).slice(2)}`);
}

function getCustomerName(b: Booking): string {
  if (b.isGuest) {
    const name = [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ').trim();
    if (name) return name;
    return (b.customerInfo && b.customerInfo.name) || b.userName || 'Invitado';
  }
  return b.userName || (b.customerInfo && b.customerInfo.name) || 'Cliente';
}

function getCustomerEmail(b: Booking): string | undefined {
  return b.userEmail || (b.customerInfo && b.customerInfo.email) || (b.guest && b.guest.email) || undefined;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({
        ok: true,
        data: {
          totalRevenue: 0,
          totalUsers: 0,
          totalBookings: 0,
          recentBookings: [],
          holeStats: { holes9: 0, holes18: 0, holes27: 0 },
          revenueByHoles: { holes9: 0, holes18: 0, holes27: 0 },
          series: [],
          period: { label: 'Firestore not initialized' },
          filters: { status: 'completed' }
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = Math.max(1, Math.min(parseInt(daysParam || '365', 10) || 365, 3650));
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = (searchParams.get('status') || '').trim();
    const courseIdParam = (searchParams.get('courseId') || '').trim();

    // Build date range (prefer explicit start/end, else fallback to days)
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - days + 1);

    let fromISO = toISODateString(fromDate);
    let toISO = toISODateString(today);

    if (startDateParam && endDateParam) {
      fromISO = startDateParam;
      toISO = endDateParam;
    }

    // Status filter: default to 'completed' if not provided
    const statusFilter = statusParam || 'completed';
    const courseIdFilter = courseIdParam || '';

    const bookingsCol = collection(db, 'bookings');
    const usersCol = collection(db, 'users');

    // Count users (unfiltered, global)
    const usersCountSnap = await getCountFromServer(query(usersCol));

    // Build constraints for bookings count (respect filters)
    const countConstraints: any[] = [
      where('createdAt', '>=', fromISO),
      where('createdAt', '<=', toISO),
    ];
    if (courseIdFilter) countConstraints.push(where('courseId', '==', courseIdFilter));
    if (statusFilter && statusFilter !== 'all') countConstraints.push(where('status', '==', statusFilter));

    let bookingsCountSnap;
    try {
      bookingsCountSnap = await getCountFromServer(query(bookingsCol, ...countConstraints));
    } catch (err) {
      console.warn('Count query fallback (bookings):', err);
      const allSnap = await getDocs(query(bookingsCol, orderBy('createdAt', 'desc')));
      const all = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      const filtered = all.filter(b => {
        const created = String(b.createdAt || '');
        const statusOk = statusFilter === 'all' ? true : b.status === statusFilter;
        const courseOk = courseIdFilter ? (b.courseId === courseIdFilter) : true;
        return created >= fromISO && created <= toISO && statusOk && courseOk;
      });
      // Emulate count
      bookingsCountSnap = { data: () => ({ count: filtered.length }) } as any;
    }

    // Recent bookings (respect filters)
    let recentBookingsSnap;
    try {
      const recentConstraints: any[] = [
        where('createdAt', '>=', fromISO),
        where('createdAt', '<=', toISO),
        orderBy('createdAt', 'desc'),
        fsLimit(5),
      ];
      if (statusFilter && statusFilter !== 'all') recentConstraints.unshift(where('status', '==', statusFilter));
      if (courseIdFilter) recentConstraints.unshift(where('courseId', '==', courseIdFilter));
      recentBookingsSnap = await getDocs(query(bookingsCol, ...recentConstraints));
    } catch (err) {
      console.warn('Recent bookings query fallback:', err);
      const snap = await getDocs(query(bookingsCol, orderBy('createdAt', 'desc')));
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      const filtered = all.filter(b => {
        const created = String(b.createdAt || '');
        const statusOk = statusFilter === 'all' ? true : b.status === statusFilter;
        const courseOk = courseIdFilter ? (b.courseId === courseIdFilter) : true;
        return created >= fromISO && created <= toISO && statusOk && courseOk;
      }).slice(0, 5);
      recentBookingsSnap = { docs: filtered.map(b => ({ id: b.id!, data: () => b })) } as any;
    }

    // Bookings for revenue and hole stats (respect filters)
    let filteredBookings: Booking[] = [];
    try {
      const constraints: any[] = [
        where('createdAt', '>=', fromISO),
        where('createdAt', '<=', toISO),
      ];
      if (statusFilter && statusFilter !== 'all') constraints.push(where('status', '==', statusFilter));
      if (courseIdFilter) constraints.push(where('courseId', '==', courseIdFilter));
      const q = query(bookingsCol, ...constraints);
      const snap = await getDocs(q);
      filteredBookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    } catch (err) {
      console.warn('Dashboard-stats query fallback (filtered bookings):', err);
      const snap = await getDocs(query(bookingsCol, orderBy('createdAt', 'desc')));
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      filteredBookings = all.filter(b => {
        const created = String(b.createdAt || '');
        const statusOk = statusFilter === 'all' ? true : b.status === statusFilter;
        const courseOk = courseIdFilter ? (b.courseId === courseIdFilter) : true;
        return created >= fromISO && created <= toISO && statusOk && courseOk;
      });
    }

    // Aggregations
    let totalRevenue = 0;
    const holeStats = { holes9: 0, holes18: 0, holes27: 0 };
    const revenueByHoles = { holes9: 0, holes18: 0, holes27: 0 };

    const seriesMap = new Map<string, number>();

    filteredBookings.forEach(b => {
      const revenue = Number(b.totalPrice || 0) || 0;
      const holes = Number(b.holes || 18);
      totalRevenue += revenue;
      if (holes === 9) {
        holeStats.holes9++;
        revenueByHoles.holes9 += revenue;
      } else if (holes === 27) {
        holeStats.holes27++;
        revenueByHoles.holes27 += revenue;
      } else {
        holeStats.holes18++;
        revenueByHoles.holes18 += revenue;
      }
      // Series by date (use booking.date if available, else createdAt)
      const dStr = typeof b.date === 'string' && b.date ? String(b.date).slice(0, 10) : String(b.createdAt || '').slice(0, 10);
      if (dStr) {
        seriesMap.set(dStr, (seriesMap.get(dStr) || 0) + revenue);
      }
    });

    const series = Array.from(seriesMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, revenue]) => ({ date, revenue }));

    // New aggregates: status distribution and top customers
    const statusDistribution: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const s = b.status || 'unknown';
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    });

    const customerMap: Record<string, { key: string; name: string; email?: string; count: number; totalAmount: number }> = {};
    filteredBookings.forEach(b => {
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

    const recentBookings = recentBookingsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const response = NextResponse.json({
      ok: true,
      data: {
        totalRevenue,
        totalUsers: usersCountSnap.data().count,
        totalBookings: typeof (bookingsCountSnap as any).data === 'function' ? (bookingsCountSnap as any).data().count : (bookingsCountSnap as any).data.count,
        recentBookings,
        holeStats,
        revenueByHoles,
        series,
        statusDistribution,
        topCustomers,
        period: { label: startDateParam && endDateParam ? `Periodo ${fromISO} a ${toISO}` : `Últimos ${days} días`, from: fromISO, to: toISO },
        filters: { status: statusFilter, courseId: courseIdFilter || undefined }
      }
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' }
    });

    return response;
  } catch (error: any) {
    console.error('Error in dashboard-stats endpoint:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal error' }, { status: 500 });
  }
}