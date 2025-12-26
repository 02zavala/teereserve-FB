'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function TestSender() {
  const { toast } = useToast();
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!testChatId || !testMessage) {
      toast({
        title: 'Error',
        description: 'Por favor completa el Chat ID y el mensaje',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { adminFetch } = await import('@/lib/admin-fetch');
      const res = await adminFetch('/api/admin/telegram-alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: testChatId, message: testMessage }),
      });

      if (!res.ok) throw new Error('Request failed');

      toast({ title: 'Éxito', description: 'Mensaje de prueba enviado' });
      setTestMessage('');
      setTestChatId('');
    } catch (err) {
      console.error('TestSender error', err);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje de prueba',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Mensaje de Prueba</CardTitle>
        <CardDescription>
          Prueba la configuración del bot de Telegram enviando un mensaje a un Chat ID
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
        <Button onClick={handleSend} disabled={loading} className="w-full">
          {loading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
        </Button>
      </CardContent>
    </Card>
  );
}
