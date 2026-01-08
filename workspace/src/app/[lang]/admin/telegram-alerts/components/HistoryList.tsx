'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AdminAlert {
  id: string;
  type: string;
  recipientChatId: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
}

function StatusBadge({ status }: { status: AdminAlert['status'] }) {
  const label = status === 'sent' ? 'Enviado' : status === 'failed' ? 'Fallido' : 'Pendiente';
  const variant = status === 'sent' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{label}</Badge>;
}

export default function HistoryList() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadHistory(true);
  }, []);

  async function loadHistory(reset = true) {
    try {
      if (reset) setLoading(true);
      const currentOffset = reset ? 0 : offset;
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch(`/api/admin/telegram-alerts/history?limit=${limit}&offset=${currentOffset}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.alerts) ? data.alerts : Array.isArray(data) ? data : [];
        setAlerts(prev => (reset ? list : [...prev, ...list]));
        setHasMore(!!data?.hasMore);
        setOffset(currentOffset + limit);
      }
    } catch (err) {
      console.error('Error loading history', err);
    } finally {
      if (reset) setLoading(false);
    }
  }

  async function loadMore() {
    try {
      setLoadingMore(true);
      await loadHistory(false);
    } finally {
      setLoadingMore(false);
    }
  }

  async function clearAll() {
    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/history?clearAll=true', { method: 'DELETE' });
      if (res.ok) {
        setAlerts([]);
        setOffset(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Clear history error', err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Historial de Alertas</h2>
        {/* AlertDialog para confirmar limpieza de historial */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Limpiar historial</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpiar historial</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán todos los registros del historial de alertas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={clearAll}>Limpiar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>Últimas alertas enviadas por el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Cargando historial...</p>}
            {!loading && alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.type}</span>
                    <StatusBadge status={alert.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(alert.sentAt).toLocaleString('es-ES')}</p>
                </div>
                <div className="text-sm text-muted-foreground">Chat: {alert.recipientChatId}</div>
              </div>
            ))}
            {!loading && alerts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay alertas en el historial</p>
            )}
            {hasMore && !loading && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Cargando...' : 'Cargar más'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
