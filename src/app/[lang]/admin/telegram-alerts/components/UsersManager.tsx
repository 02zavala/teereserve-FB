'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserAlertSettings {
  id: string;
  telegramChatId: string;
  role: string;
  isActive: boolean;
  alertTypes: string[];
  createdAt: string;
  updatedAt: string;
}

const availableRoles = ['SuperAdmin', 'CourseOwner', 'Manager', 'EventManager'];

export default function UsersManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAlertSettings[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUser, setNewUser] = useState({
    telegramChatId: '',
    role: 'Manager',
    alertTypes: [] as string[],
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newUser.telegramChatId || !newUser.role) {
      toast({ title: 'Error', description: 'Completa Chat ID y Rol', variant: 'destructive' });
      return;
    }

    const userToSave = {
      telegramChatId: newUser.telegramChatId,
      role: newUser.role,
      isActive: true,
      alertTypes: newUser.alertTypes,
      createdAt: new Date().toISOString(),
    };

    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Éxito', description: 'Usuario agregado' });
      setNewUser({ telegramChatId: '', role: 'Manager', alertTypes: [] });
      await loadUsers();
    } catch (err) {
      console.error('Add user error', err);
      toast({ title: 'Error', description: 'No se pudo agregar el usuario', variant: 'destructive' });
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, isActive, updatedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast({ title: 'Actualizado', description: 'Estado del usuario actualizado' });
      await loadUsers();
    } catch (err) {
      console.error('Toggle active error', err);
      toast({ title: 'Error', description: 'No se pudo actualizar el usuario', variant: 'destructive' });
    }
  }

  async function deleteUser(userId: string) {
    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch(`/api/admin/telegram-alerts/users?id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Eliminado', description: 'Usuario eliminado' });
      await loadUsers();
    } catch (err) {
      console.error('Delete user error', err);
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nuevo Usuario</CardTitle>
          <CardDescription>Configura un nuevo usuario para recibir notificaciones de Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="chatId">Chat ID de Telegram</Label>
              <Input
                id="chatId"
                placeholder="123456789"
                value={newUser.telegramChatId}
                onChange={(e) => setNewUser({ ...newUser, telegramChatId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser} className="w-full">Agregar Usuario</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Configurados</CardTitle>
          <CardDescription>Gestiona los usuarios que reciben notificaciones de Telegram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && (
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
            )}
            {!loading && users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Chat ID: {user.telegramChatId}</span>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tipos de alerta: {user.alertTypes?.length ? user.alertTypes.join(', ') : 'Ninguno'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={user.isActive} onCheckedChange={(checked) => toggleUserActive(user.id, checked)} />
                  <span className="text-sm">{user.isActive ? 'Activo' : 'Inactivo'}</span>
                  {/* AlertDialog para confirmar eliminación */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Eliminar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará el usuario de alertas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteUser(user.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {!loading && users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay usuarios configurados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
