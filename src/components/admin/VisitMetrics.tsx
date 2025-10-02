// NUEVO: Componente de métricas de visitas para el panel admin
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, Globe, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/visit-metrics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
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
            }
          }
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setMetrics(data.data || data);
      } catch (err) {
        console.error('Error fetching visit metrics:', err);
        // Only show error in production or for non-auth errors
        if (process.env.NODE_ENV === 'production' || !err.message.includes('401')) {
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
  }, []);

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
            No visit metrics available
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
            <div className="text-2xl font-bold">{metrics.totalVisits.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{metrics.todayVisits.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{metrics.averageVisitsPerDay.toFixed(1)}</div>
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
            <div className="text-2xl font-bold">{metrics.uniqueIPs.toLocaleString()}</div>
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
                      {new Date(ip.timestamp).toLocaleString()}
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