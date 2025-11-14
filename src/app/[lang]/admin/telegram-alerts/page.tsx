'use client';

import dynamic from 'next/dynamic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users, Settings, TestTube } from 'lucide-react';

const TestSender = dynamic(() => import('./components/TestSender'), { ssr: false });
const UsersManager = dynamic(() => import('./components/UsersManager'), { ssr: false });
const RolesManager = dynamic(() => import('./components/RolesManager'), { ssr: false });
const HistoryList = dynamic(() => import('./components/HistoryList'), { ssr: false });

export default function TelegramAlertsAdmin() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Configuración de Alertas de Telegram</h1>
      </div>
      <Alert>
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
          <UsersManager />
        </TabsContent>
        <TabsContent value="roles" className="space-y-4">
          <RolesManager />
        </TabsContent>
        <TabsContent value="test" className="space-y-4">
          <TestSender />
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <HistoryList />
        </TabsContent>
      </Tabs>
    </div>
  );
}