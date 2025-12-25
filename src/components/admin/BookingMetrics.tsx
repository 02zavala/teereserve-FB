"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Users, CreditCard, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";

type Booking = {
  id: string;
  createdAt?: string; // ISO
  date?: string | Date;
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

interface BookingMetricsResponse {
  ok: boolean;
  period: { days: number | null; from: string | null; to: string | null; label: string };
  aggregated: { totalCount: number; totalRevenue: number; avgValue: number; statusDistribution: Record<string, number> };
  topCustomers: Array<{ key: string; name: string; email?: string; count: number; totalAmount: number }>;
  bookings: Booking[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'rescheduled', label: 'Reprogramada' },
  { value: 'checked_in', label: 'Check-in realizado' },
  { value: 'completed', label: 'Completada' },
  { value: 'canceled_customer', label: 'Cancelada por cliente' },
  { value: 'canceled_admin', label: 'Cancelada por admin' },
  { value: 'no_show', label: 'No se presentó' },
  { value: 'disputed', label: 'En disputa' },
];

function getStatusVariant(status?: string) {
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

function formatCurrency(amount: number | undefined) {
  const value = Number(amount || 0);
  return `$${value.toFixed(2)}`;
}

export function BookingMetrics({ lang = 'es' as Locale }: { lang?: Locale }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Período
  const [rangeMode, setRangeMode] = useState<'days' | 'custom'>('days');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [courseId, setCourseId] = useState<string>('all');
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aggregated, setAggregated] = useState<BookingMetricsResponse['aggregated'] | null>(null);
  const [period, setPeriod] = useState<BookingMetricsResponse['period'] | null>(null);
  const [topCustomers, setTopCustomers] = useState<BookingMetricsResponse['topCustomers']>([]);

  useEffect(() => {
    // Cargar lista de cursos para selector
    const fetchCourses = async () => {
      try {
        if (authLoading) return;
        if (!user) return;
        const { adminFetch } = await import('@/lib/admin-fetch');
        const resp = await adminFetch('/api/admin/courses/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data.courses) ? data.courses : [];
        setCourses(list);
      } catch (e) {
        console.warn('No se pudo cargar el listado de cursos:', e);
      }
    };
    fetchCourses();
  }, [user, authLoading]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (authLoading) return;
        setLoading(true);
        setError(null);

        if (!user) {
          if (process.env.NODE_ENV === 'production') {
            setError('Debes iniciar sesión como administrador para ver reservas');
          } else {
            // Mock en desarrollo
            setAggregated({ totalCount: 0, totalRevenue: 0, avgValue: 0, statusDistribution: {} });
            setBookings([]);
            setTopCustomers([]);
          }
          return;
        }

        const { adminFetch } = await import('@/lib/admin-fetch');
        const params = new URLSearchParams();
        if (rangeMode === 'days') {
          params.set('days', String(selectedDays));
        } else {
          if (!fromDate || !toDate) { setLoading(false); return; }
          params.set('from', fromDate);
          params.set('to', toDate);
        }
        if (status && status !== 'all') params.set('status', status);
        if (courseId && courseId !== 'all') params.set('courseId', courseId);
        params.set('limit', '500');

        const resp = await adminFetch(`/api/admin/booking-metrics?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!resp.ok) {
          if (resp.status === 401 && process.env.NODE_ENV === 'development') {
            console.warn('Unauthorized booking metrics (dev): using mock');
            setAggregated({ totalCount: 0, totalRevenue: 0, avgValue: 0, statusDistribution: {} });
            setBookings([]);
            setTopCustomers([]);
            return;
          }
          throw new Error(`Error: ${resp.status}`);
        }

        const data: BookingMetricsResponse = await resp.json();
        setAggregated(data.aggregated);
        setPeriod(data.period);
        setTopCustomers(data.topCustomers || []);
        setBookings(data.bookings || []);
      } catch (err: any) {
        console.error('Error fetching booking metrics:', err);
        if (process.env.NODE_ENV === 'production' || !String(err?.message || '').includes('401')) {
          setError(err instanceof Error ? err.message : 'Error cargando métricas de reservas');
        } else {
          setAggregated({ totalCount: 0, totalRevenue: 0, avgValue: 0, statusDistribution: {} });
          setBookings([]);
          setTopCustomers([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, authLoading, rangeMode, selectedDays, fromDate, toDate, status, courseId]);

  const locale = useMemo(() => dateLocales[lang] || dateLocales.es, [lang]);

  const formatDate = (iso?: string | Date) => {
    if (!iso) return '—';
    try {
      const d = typeof iso === 'string' ? new Date(iso) : iso;
      return d.toLocaleString(locale.code || 'es-ES');
    } catch {
      return String(iso);
    }
  };

  const handleExportCSV = () => {
    try {
      if (!bookings || bookings.length === 0) {
        alert('No hay datos de reservas para exportar.');
        return;
      }

      const headers = [
        'fecha_creacion', 'booking_id', 'cliente', 'email', 'status', 'monto', 'jugadores', 'hoyos', 'campo'
      ];

      const escapeCSV = (val: any) => {
        const s = String(val ?? '');
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      const rows = bookings.map(b => {
        const nombre = b.isGuest
          ? [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.customerInfo?.name || b.userName || 'Invitado'
          : b.userName || b.customerInfo?.name || 'Cliente';
        const email = b.userEmail || b.customerInfo?.email || b.guest?.email || '';
        const cols = [
          b.createdAt || '',
          b.id,
          nombre,
          email,
          b.status || '',
          Number(b.totalPrice || 0).toFixed(2),
          '',
          typeof b.holes === 'number' ? b.holes : '',
          b.courseName || ''
        ];
        return cols.map(escapeCSV).join(',');
      });

      const suffixPeriod = rangeMode === 'days'
        ? (selectedDays === 365 ? 'todo_el_tiempo_365_dias' : `ultimos_${selectedDays}_dias`)
        : (fromDate && toDate ? `${fromDate}_a_${toDate}` : 'rango_personalizado');
      const selectedCourseName = (courseId && courseId !== 'all') ? (courses.find(c => c.id === courseId)?.name || courseId) : 'todos_los_campos';
      const courseSlug = selectedCourseName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const filename = `reservas_${courseSlug}_${suffixPeriod}.csv`;

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al exportar CSV de reservas:', e);
      alert('Ocurrió un error al exportar el CSV.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Período</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={rangeMode}
            onChange={(e) => setRangeMode(e.target.value as 'days' | 'custom')}
          >
            <option value="days">Últimos N días</option>
            <option value="custom">Rango personalizado</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Campo</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="all">Todos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {rangeMode === 'days' && (
          <div>
            <label className="text-sm font-medium block mb-1">Días</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
              <option value={365}>Todo el tiempo (365 días)</option>
            </select>
          </div>
        )}
        {rangeMode === 'custom' && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1">Desde</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Hasta</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label className="text-sm font-medium block mb-1">Estado</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!bookings || bookings.length === 0}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen */}
      {aggregated && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregated.totalCount}</div>
              <p className="text-xs text-muted-foreground">{period?.label || ''}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(aggregated.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Basado en monto total de reservas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(aggregated.avgValue)}</div>
              <p className="text-xs text-muted-foreground">Promedio por reserva</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                {Object.entries(aggregated.statusDistribution).map(([st, count]) => (
                  <div key={st} className="flex justify-between"><span>{st}</span><span>{count}</span></div>
                ))}
                {Object.keys(aggregated.statusDistribution).length === 0 && (
                  <div>No hay datos de estado en el período</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Clientes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes por Reservas</CardTitle>
            <CardDescription>Ranking en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Reservas</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.slice(0, 10).map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.email ? <div className="text-xs text-muted-foreground">{c.email}</div> : null}
                    </TableCell>
                    <TableCell>{c.count}</TableCell>
                    <TableCell>{formatCurrency(c.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {topCustomers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">No hay clientes en el período</div>
            )}
          </CardContent>
        </Card>

        {/* Reservas del período */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas del período</CardTitle>
            <CardDescription>Actividad de reservas filtrada</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 20).map(b => {
                  const nombre = b.isGuest
                    ? [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.customerInfo?.name || b.userName || 'Invitado'
                    : b.userName || b.customerInfo?.name || 'Cliente';
                  const fecha = b.createdAt ? formatDate(b.createdAt) : (b.date ? formatDate(b.date) : '—');
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.id}</TableCell>
                      <TableCell>{nombre}</TableCell>
                      <TableCell>{fecha}</TableCell>
                      <TableCell>{formatCurrency(b.totalPrice)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(b.status)}>{b.status || '—'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {bookings.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">No hay reservas en el período</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
