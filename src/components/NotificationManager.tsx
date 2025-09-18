'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

interface NotificationManagerProps {
  userId?: string;
  className?: string;
}

export function NotificationManager({ userId, className }: NotificationManagerProps) {
  const { 
    token, 
    permission, 
    requestPermission, 
    getNotificationToken, 
    saveTokenToServer,
    isSupported 
  } = useNotifications();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        const newToken = await getNotificationToken();
        if (newToken && userId) {
          await saveTokenToServer(newToken, userId);
        }
        toast({
          title: '¡Notificaciones habilitadas!',
          description: 'Ahora recibirás notificaciones sobre tus reservas.',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Permisos denegados',
          description: 'No se pueden enviar notificaciones sin permisos.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron habilitar las notificaciones.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Habilitadas', variant: 'default' as const, icon: Bell };
      case 'denied':
        return { text: 'Bloqueadas', variant: 'destructive' as const, icon: BellOff };
      default:
        return { text: 'No configuradas', variant: 'secondary' as const, icon: Settings };
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones no disponibles
          </CardTitle>
          <CardDescription>
            Tu navegador no soporta notificaciones push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Notificaciones Push
        </CardTitle>
        <CardDescription>
          Recibe notificaciones sobre confirmaciones de reservas, recordatorios y actualizaciones importantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado:</span>
          <Badge variant={status.variant}>{status.text}</Badge>
        </div>
        
        {token && (
          <div className="text-xs text-muted-foreground">
            <p>Token registrado: {token.substring(0, 20)}...</p>
          </div>
        )}
        
        {permission !== 'granted' && (
          <Button 
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Configurando...' : 'Habilitar Notificaciones'}
          </Button>
        )}
        
        {permission === 'granted' && !token && (
          <Button 
            onClick={getNotificationToken}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Obteniendo token...' : 'Renovar Token'}
          </Button>
        )}
        
        {permission === 'denied' && (
          <div className="text-sm text-muted-foreground">
            <p>Las notificaciones están bloqueadas. Para habilitarlas:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Haz clic en el icono de candado en la barra de direcciones</li>
              <li>Cambia los permisos de notificaciones a "Permitir"</li>
              <li>Recarga la página</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationManager;