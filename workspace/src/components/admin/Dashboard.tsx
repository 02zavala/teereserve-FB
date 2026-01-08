"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, Loader2, Flag, TrendingUp, Filter } from "lucide-react";
import { getRevenueLast7Days } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/types";
import { format } from "date-fns";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { HealthCheck } from '@/components/monitoring/HealthCheck';
import { VisitMetrics } from '@/components/admin/VisitMetrics'; // NUEVO: Importar componente de métricas
import { BookingMetrics } from '@/components/admin/BookingMetrics'; // NUEVO: métricas y filtros de reservas

const RevenueChart = dynamic(() => import('@/components/admin/RevenueChart').then(mod => ({ default: mod.RevenueChart })), { ssr: false });
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
    totalRevenue: number;
    totalUsers: number;
    totalBookings: number;
    recentBookings: Booking[];
    holeStats: { holes9: number; holes18: number; holes27: number };
    revenueByHoles: { holes9: number; holes18: number; holes27: number };
    series?: { date: string; revenue: number }[];
    statusDistribution?: Record<string, number>;
    topCustomers?: { key: string; name: string; email?: string; count: number; totalAmount: number }[];
}

function getStatusVariant(status: Booking['status']) {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'canceled_customer':
        case 'canceled_admin': return 'destructive';
        case 'checked_in': return 'default';
        case 'rescheduled': return 'secondary';
        case 'no_show': return 'destructive';
        case 'disputed': return 'destructive';
        case 'pending':
        default:
            return 'outline';
    }
}

function RecentBookingRow({ booking, lang }: { booking: Booking, lang: Locale }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && booking.date) {
            try {
                const bookingDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                const locale = dateLocales[lang] || dateLocales.en;
                setFormattedDate(format(bookingDate, 'PPP', { locale }));
            } catch (error) {
                console.error('Error formatting date:', error);
                setFormattedDate('Invalid date');
            }
        }
    }, [isClient, booking.date, lang]);

    if (!isClient) {
        return (
            <TableRow>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            </TableRow>
        );
    }

    return (
        <TableRow>
            <TableCell className="font-medium">{booking.id}</TableCell>
            <TableCell>{booking.userName}</TableCell>
            <TableCell>{formattedDate}</TableCell>
            <TableCell>${booking.totalPrice?.toFixed(2) || '0.00'}</TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(booking.status)}>
                    {booking.status}
                </Badge>
            </TableCell>
        </TableRow>
    );
}

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [status, setStatus] = useState<string>('completed');
    const [courseId, setCourseId] = useState<string>('');
    const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
    const [applying, setApplying] = useState<boolean>(false);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;
    const { user } = useAuth();

    const toDateInputString = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    const setPresetDays = (days: number) => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - (days - 1));
        setStartDate(toDateInputString(start));
        setEndDate(toDateInputString(today));
    };

    const loadCourses = async () => {
        try {
            if (!user) return;
            const { adminFetch } = await import('@/lib/admin-fetch');
            const resp = await adminFetch('/api/admin/courses/list', {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!resp.ok) return;
            const json = await resp.json();
            const list = Array.isArray(json.courses) ? json.courses : [];
            setCourses(list);
        } catch (e) {
            console.warn('No se pudo cargar el listado de cursos:', e);
        }
    };

    useEffect(() => {
        loadCourses();
    }, [user]);

    useEffect(() => {
        // Inicializar filtros desde la URL si están presentes
        try {
            const s = searchParams?.get('startDate');
            const e = searchParams?.get('endDate');
            const st = searchParams?.get('status');
            const c = searchParams?.get('courseId');
            if (s) setStartDate(s);
            if (e) setEndDate(e);
            if (st) setStatus(st);
            if (c) setCourseId(c);
        } catch (_) {}
    }, [searchParams]);

    async function loadData() {
        if (!user) return;
        setLoading(true);
        try {
            const { adminFetch } = await import('@/lib/admin-fetch');
            const qs = new URLSearchParams();
            if (startDate) qs.set('startDate', startDate);
            if (endDate) qs.set('endDate', endDate);
            if (status) qs.set('status', status);
            if (courseId) qs.set('courseId', courseId);
            if (!startDate || !endDate) qs.set('days', '365');
            const res = await adminFetch(`/api/admin/dashboard-stats?${qs.toString()}`);
            if (!res.ok) throw new Error(`Failed to load dashboard stats (${res.status})`);
            const json = await res.json();
            const data = json.data as DashboardStats;
            setStats(data);
            setRevenueData(data.series || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            setStats({
                totalRevenue: 0,
                totalUsers: 0,
                totalBookings: 0,
                recentBookings: [],
                holeStats: { holes9: 0, holes18: 0, holes27: 0 },
                revenueByHoles: { holes9: 0, holes18: 0, holes27: 0 },
                series: []
            });
            setRevenueData([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [user]);

    const applyFilters = async () => {
        setApplying(true);
        const qs = new URLSearchParams();
        if (startDate) qs.set('startDate', startDate);
        if (endDate) qs.set('endDate', endDate);
        if (status) qs.set('status', status);
        if (courseId) qs.set('courseId', courseId);
        if (!startDate || !endDate) qs.set('days', '365');
        router.replace(`${pathname}?${qs.toString()}`);
        await loadData();
        setApplying(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }
    
    if (!stats) {
        return (
             <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">Could not load dashboard data.</p>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary mb-6">Dashboard</h1>

            {/* Filters */}
            <Card className="mb-4">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" /> Filtros
                        </CardTitle>
                        <button
                            className="px-3 py-1 rounded bg-primary text-white text-sm disabled:opacity-50"
                            onClick={applyFilters}
                            disabled={applying}
                        >
                            {applying ? 'Aplicando…' : 'Aplicar filtros'}
                        </button>
                    </div>
                    <CardDescription>Rango de fechas y estado de reserva</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-4">
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Fecha inicio</label>
                            <input
                                type="date"
                                className="border rounded px-2 py-1 w-full"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Fecha fin</label>
                            <input
                                type="date"
                                className="border rounded px-2 py-1 w-full"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Estado</label>
                            <select
                                className="border rounded px-2 py-1 w-full"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">Todos</option>
                                <option value="completed">Completadas</option>
                                <option value="confirmed">Confirmadas</option>
                                <option value="checked_in">Check-in</option>
                                <option value="rescheduled">Reprogramadas</option>
                                <option value="pending">Pendientes</option>
                                <option value="canceled_customer">Canceladas cliente</option>
                                <option value="canceled_admin">Canceladas admin</option>
                                <option value="no_show">No show</option>
                                <option value="disputed">Disputadas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Curso</label>
                            <select
                                className="border rounded px-2 py-1 w-full"
                                value={courseId}
                                onChange={(e) => setCourseId(e.target.value)}
                            >
                                <option value="">Todos los cursos</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-muted-foreground">Presets:</span>
                        <button type="button" className="px-2 py-1 rounded border text-xs hover:bg-muted" onClick={() => setPresetDays(7)}>7 días</button>
                        <button type="button" className="px-2 py-1 rounded border text-xs hover:bg-muted" onClick={() => setPresetDays(30)}>30 días</button>
                        <button type="button" className="px-2 py-1 rounded border text-xs hover:bg-muted" onClick={() => setPresetDays(90)}>90 días</button>
                        <button type="button" className="px-2 py-1 rounded border text-xs hover:bg-muted" onClick={() => setPresetDays(365)}>Último año</button>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : !stats ? (
                <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No se pudieron cargar los datos del dashboard.</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Ingresos (filtrados)
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Según filtros aplicados (agregados en servidor)
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Usuarios totales
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                <p className="text-xs text-muted-foreground">
                                    Registrados (conteo global en servidor)
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Reservas (filtradas)
                                </CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                                <p className="text-xs text-muted-foreground">
                                    Según filtros aplicados (conteo en servidor)
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Ingreso promedio por reserva
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ${stats.totalBookings > 0 ? (stats.totalRevenue / stats.totalBookings).toFixed(2) : '0.00'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Sobre conjunto filtrado (agregados en servidor)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumen de ingresos</CardTitle>
                                <CardDescription>
                                    Serie diaria del periodo seleccionado
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <RevenueChart data={revenueData} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribución por estado</CardTitle>
                                <CardDescription>Reservas por estado (filtros aplicados)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(stats.statusDistribution || {}).map(([s, count]) => (
                                        <div key={s} className="flex items-center justify-between p-2 border rounded">
                                            <Badge variant={getStatusVariant(s as Booking['status'])}>{s}</Badge>
                                            <span className="text-sm">{count}</span>
                                        </div>
                                    ))}
                                    {(!stats.statusDistribution || Object.keys(stats.statusDistribution).length === 0) && (
                                        <p className="text-sm text-muted-foreground">Sin datos de estado.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Top clientes</CardTitle>
                                <CardDescription>Ranking por número de reservas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead className="hidden md:table-cell">Email</TableHead>
                                            <TableHead>Reservas</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(stats.topCustomers || []).slice(0, 10).map((c) => (
                                            <TableRow key={c.key}>
                                                <TableCell>{c.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{c.email || '-'}</TableCell>
                                                <TableCell>{c.count}</TableCell>
                                                <TableCell>${(c.totalAmount || 0).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!stats.topCustomers || stats.topCustomers.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">Sin clientes destacados.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actividad reciente</CardTitle>
                                <CardDescription>
                                    Últimas reservas con filtros y rankings
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BookingMetrics lang={lang} />
                                <div className="mt-4 text-center">
                                    <Link 
                                        href={`/${lang}/admin/bookings`} 
                                        className="text-primary hover:underline"
                                    >
                                        Ver todas las reservas →
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visit Metrics Section */}
                    <div className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visit Analytics</CardTitle>
                                <CardDescription>
                                    Website traffic and user activity metrics
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VisitMetrics />
                            </CardContent>
                        </Card>
                    </div>

                    {/* System Health Status */}
                    <div className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Status</CardTitle>
                                <CardDescription>
                                    API and services health monitoring
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <HealthCheck showDetails={true} />
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
