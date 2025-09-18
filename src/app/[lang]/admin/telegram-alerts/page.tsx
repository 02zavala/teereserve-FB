'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Bell, Settings, Users, MessageSquare, TestTube } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserAlertSettings {
  id: string;
  telegramChatId: string;
  role: string;
  isActive: boolean;
  alertTypes: string[];
  createdAt: string;
  updatedAt: string;
}

interface AlertRoleConfig {
  alertType: string;
  allowedRoles: string[];
  isActive: boolean;
}

interface AdminAlert {
  id: string;
  type: string;
  recipientChatId: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
}

export default function TelegramAlertsAdmin() {
  const [userSettings, setUserSettings] = useState<UserAlertSettings[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<AlertRoleConfig[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const { toast } = useToast();

  // Estados para formularios
  const [newUser, setNewUser] = useState({
    telegramChatId: '',
    role: 'Manager',
    alertTypes: [] as string[]
  });

  const availableRoles = ['SuperAdmin', 'CourseOwner', 'Manager', 'EventManager'];
  const availableAlertTypes = ['booking_confirmed', 'payment_failed', 'event_ticket_purchased'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar configuraciones de usuarios
      const usersResponse = await fetch('/api/admin/telegram-alerts/users');
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setUserSettings(Array.isArray(users) ? users : []);
      }

      // Cargar configuraciones de roles
      const rolesResponse = await fetch('/api/admin/telegram-alerts/roles');
      if (rolesResponse.ok) {
        const roles = await rolesResponse.json();
        setRoleConfigs(Array.isArray(roles) ? roles : []);
      }

      // Cargar historial de alertas
      const alertsResponse = await fetch('/api/admin/telegram-alerts/history');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        // La API devuelve { alerts, total, hasMore }, necesitamos extraer el array alerts
        const alerts = alertsData.alerts || [];
        setAdminAlerts(Array.isArray(alerts) ? alerts : []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de configuración',
        variant: 'destructive'
      });
      // Asegurar que los estados sean arrays válidos en caso de error
      setUserSettings([]);
      setRoleConfigs([]);
      setAdminAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (user: UserAlertSettings) => {
    try {
      const response = await fetch('/api/admin/telegram-alerts/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Configuración de usuario guardada correctamente'
        });
        loadData();
      } else {
        throw new Error('Error saving user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración del usuario',
        variant: 'destructive'
      });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.telegramChatId || !newUser.role) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    const userToAdd: UserAlertSettings = {
      id: `user-${Date.now()}`,
      telegramChatId: newUser.telegramChatId,
      role: newUser.role,
      isActive: true,
      alertTypes: newUser.alertTypes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await handleSaveUser(userToAdd);
    setNewUser({ telegramChatId: '', role: 'Manager', alertTypes: [] });
  };

  const handleTestMessage = async () => {
    if (!testMessage || !testChatId) {
      toast({
        title: 'Error',
        description: 'Por favor completa el mensaje y el Chat ID',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/telegram-alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: testChatId,
          message: testMessage
        })
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Mensaje de prueba enviado correctamente'
        });
        setTestMessage('');
        setTestChatId('');
        loadData(); // Recargar para ver el nuevo registro
      } else {
        throw new Error('Error sending test message');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje de prueba',
        variant: 'destructive'
      });
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const user = userSettings.find(u => u.id === userId);
    if (user) {
      await handleSaveUser({ ...user, isActive, updatedAt: new Date().toISOString() });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Configuración de Alertas de Telegram</h1>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configura las notificaciones de Telegram para recibir alertas sobre reservas, pagos y eventos.
          Asegúrate de tener configurado el token del bot de Telegram en las variables de entorno.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Pruebas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Nuevo Usuario</CardTitle>
              <CardDescription>
                Configura un nuevo usuario para recibir notificaciones de Telegram
              </CardDescription>
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
                  <Button onClick={handleAddUser} className="w-full">
                    Agregar Usuario
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios Configurados</CardTitle>
              <CardDescription>
                Gestiona los usuarios que reciben notificaciones de Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userSettings.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Chat ID: {user.telegramChatId}</span>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tipos de alerta: {user.alertTypes.join(', ') || 'Ninguno'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) => toggleUserActive(user.id, checked)}
                      />
                      <span className="text-sm">{user.isActive ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </div>
                ))}
                {userSettings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay usuarios configurados
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Roles</CardTitle>
              <CardDescription>
                Define qué roles pueden recibir cada tipo de alerta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleConfigs.map((config) => (
                  <div key={config.alertType} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{config.alertType}</h3>
                      <Switch checked={config.isActive} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.allowedRoles.map(role => (
                        <Badge key={role} variant="secondary">{role}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Mensaje de Prueba</CardTitle>
              <CardDescription>
                Prueba la configuración enviando un mensaje de prueba a un chat específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testChatId">Chat ID de destino</Label>
                <Input
                  id="testChatId"
                  placeholder="123456789"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="testMessage">Mensaje de prueba</Label>
                <Textarea
                  id="testMessage"
                  placeholder="Escribe tu mensaje de prueba aquí..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleTestMessage} className="w-full">
                Enviar Mensaje de Prueba
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Alertas</CardTitle>
              <CardDescription>
                Revisa el historial de alertas enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.type}</span>
                        {getStatusBadge(alert.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Chat: {alert.recipientChatId}
                    </div>
                  </div>
                ))}
                {adminAlerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay alertas en el historial
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}