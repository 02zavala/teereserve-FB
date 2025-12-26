'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AlertRoleConfig {
  alertType: string;
  allowedRoles: string[];
  isActive: boolean;
}

export default function RolesManager() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<AlertRoleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [newConfig, setNewConfig] = useState<AlertRoleConfig>({
    alertType: '',
    allowedRoles: [],
    isActive: true,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/roles');
      if (res.ok) {
        const data = await res.json();
        setConfigs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading roles configs', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(config: AlertRoleConfig) {
    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Guardado', description: 'Configuración actualizada' });
      await loadConfigs();
    } catch (err) {
      console.error('Save role config error', err);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    }
  }

  async function deleteConfig(alertType: string) {
    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch(`/api/admin/telegram-alerts/roles?alertType=${encodeURIComponent(alertType)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Eliminado', description: 'Configuración borrada' });
      await loadConfigs();
    } catch (err) {
      console.error('Delete role config error', err);
      toast({ title: 'Error', description: 'No se pudo eliminar la configuración', variant: 'destructive' });
    }
  }

  async function addNewConfig() {
    if (!newConfig.alertType) {
      toast({ title: 'Error', description: 'Especifica un tipo de alerta', variant: 'destructive' });
      return;
    }
    await saveConfig(newConfig);
    setNewConfig({ alertType: '', allowedRoles: [], isActive: true });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Roles</CardTitle>
          <CardDescription>Define qué roles pueden recibir cada tipo de alerta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="alertType">Tipo de alerta</Label>
              <Input id="alertType" placeholder="booking_confirmed" value={newConfig.alertType} onChange={(e) => setNewConfig({ ...newConfig, alertType: e.target.value })} />
            </div>
            <div>
              <Label>Roles permitidos (coma separada)</Label>
              <Input placeholder="Manager,SuperAdmin" value={newConfig.allowedRoles.join(',')} onChange={(e) => setNewConfig({ ...newConfig, allowedRoles: e.target.value.split(',').map(r => r.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-end">
              <Button onClick={addNewConfig} className="w-full">Agregar Configuración</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles Configurados</CardTitle>
          <CardDescription>Gestiona qué roles reciben cada tipo de alerta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Cargando configuraciones...</p>}
            {!loading && configs.map((config) => (
              <div key={config.alertType} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{config.alertType}</h3>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.isActive} onCheckedChange={(checked) => saveConfig({ ...config, isActive: checked })} />
                    {/* AlertDialog para confirmar eliminación de configuración */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Eliminar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar configuración</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se borrará la configuración de roles para este tipo de alerta.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteConfig(config.alertType)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.allowedRoles.map(role => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                  ))}
                </div>
              </div>
            ))}
            {!loading && configs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay configuraciones de roles</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
