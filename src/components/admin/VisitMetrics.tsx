// NUEVO: Componente de métricas de visitas para el panel admin
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, Globe, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/context/AuthContext";

interface VisitMetrics {
  totalVisits: number;
  todayVisits: number;
  averageVisitsPerDay: number;
  topPages: Array<{ page: string; visits: number }>;
  uniqueIPs: number;
  recentIPs: Array<{
    userId: string;
    ipAddress: string;
    action: string;
    timestamp: Date;
    userAgent: string;
  }>;
}

export function VisitMetrics() {
  const [metrics, setMetrics] = useState<VisitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Helper para formatear timestamp (acepta Firestore Timestamp o fecha/ISO)
  const formatTimestamp = (ts: any) => {
    try {
      const date = ts && typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
      return date.toLocaleString();
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Esperar a que termine la carga de autenticación
        if (authLoading) return;

        setLoading(true);
        setError(null);
        
        if (!user) {
          // Si no hay usuario, en producción muestra error claro
          if (process.env.NODE_ENV === 'production') {
            setError('Debes iniciar sesión como administrador para ver métricas');
          } else {
            // En desarrollo, usa datos mock para no bloquear el panel
            setMetrics({
              totalVisits: 0,
              todayVisits: 0,
              averageVisitsPerDay: 0,
              topPages: [],
              uniqueIPs: 0,
              recentIPs: []
            });
          }
          return;
        }
        
        const token = await user.getIdToken();

        const response = await fetch('/api/admin/visit-metrics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // In development, don't show auth errors as they're expected
            if (process.env.NODE_ENV === 'development') {
              console.warn('Unauthorized access to visit metrics, using mock data');
              // Set mock data for development
              setMetrics({
                totalVisits: 0,
                todayVisits: 0,
                averageVisitsPerDay: 0,
                topPages: [],
                uniqueIPs: 0,
                recentIPs: []
              });
              return;
            } else {
              // En producción, mostrar error claro de autenticación
              throw new Error('401 Unauthorized: inicia sesión como administrador para ver métricas');
            }
          }
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        const payload = data?.data ?? data;

        const topPages = Array.isArray(payload?.aggregatedStats?.topPages)
          ? payload.aggregatedStats.topPages.map((tp: any) => ({
              page: tp?.page ?? 'Unknown',
              visits: Number(tp?.visits ?? 0)
            }))
          : [];

        const recentIPs = Array.isArray(payload?.userIPs)
          ? payload.userIPs.map((ip: any) => ({
              userId: ip?.userId ?? '',
              ipAddress: ip?.ipAddress ?? '',
              action: ip?.action ?? 'login',
              timestamp: ip?.timestamp ?? null,
              userAgent: ip?.userAgent ?? ''
            }))
          : [];

        const uniqueIPs = recentIPs.length > 0
          ? Array.from(new Set(recentIPs.map(ip => ip.ipAddress))).length
          : 0;

        setMetrics({
          totalVisits: Number(payload?.aggregatedStats?.totalVisitsAllTime ?? 0),
          todayVisits: Number(payload?.todayStats?.totalVisits ?? 0),
          averageVisitsPerDay: Number(payload?.aggregatedStats?.avgVisitsPerDay ?? 0),
          topPages,
          uniqueIPs,
          recentIPs
        });
      } catch (err: any) {
        console.error('Error fetching visit metrics:', err);
        // Only show error in production or for non-auth errors
        if (process.env.NODE_ENV === 'production' || !String(err?.message || '').includes('401')) {
          setError(err instanceof Error ? err.message : 'Error loading metrics');
        } else {
          // Use mock data in development for auth errors
          setMetrics({
            totalVisits: 0,
            todayVisits: 0,
            averageVisitsPerDay: 0,
            topPages: [],
            uniqueIPs: 0,
            recentIPs: []
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            Error loading visit metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            {user ? 'No visit metrics available' : 'Inicia sesión para ver métricas'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Visits
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.totalVisits ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Visits
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.todayVisits ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Visits today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Daily Average
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(metrics.averageVisitsPerDay ?? 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Visits per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique IPs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.uniqueIPs ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Registered IPs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Páginas más visitadas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>
              Most visited pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topPages.slice(0, 5).map((page, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {page.page === '/' ? 'Home' : page.page}
                    </TableCell>
                    <TableCell className="text-right">{page.visits}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {metrics.topPages.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No page data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* IPs recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent User IPs</CardTitle>
            <CardDescription>
              Latest IP registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentIPs.slice(0, 5).map((ip, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {ip.ipAddress}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ip.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(ip.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {metrics.recentIPs.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No IP data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}