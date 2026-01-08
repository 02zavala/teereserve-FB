"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Save, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Bug, 
  Activity,
  Database,
  Globe,
  Shield
} from 'lucide-react';
import { logger, LogLevel } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface LoggingSettings {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint: string;
  apiKey: string;
  bufferSize: number;
  flushInterval: number;
  enableLocalStorage: boolean;
  maxLocalEntries: number;
  sentryDsn?: string;
  enableSentry?: boolean;
  environment: string;
  release?: string;
}

const defaultSettings: LoggingSettings = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: false,
  remoteEndpoint: '',
  apiKey: '',
  bufferSize: 50,
  flushInterval: 30000,
  enableLocalStorage: true,
  maxLocalEntries: 1000,
  enableSentry: false,
  sentryDsn: '',
  environment: 'production',
  release: '1.0.0'
};

export function LoggingConfig() {
  const [settings, setSettings] = useState<LoggingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem('logging_settings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load logging settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('logging_settings', JSON.stringify(settings));
      
      // Update logger configuration
      logger.setConfig({
        level: settings.level,
        enableConsole: settings.enableConsole,
        enableRemote: settings.enableRemote,
        remoteEndpoint: settings.remoteEndpoint,
        apiKey: settings.apiKey,
        bufferSize: settings.bufferSize,
        flushInterval: settings.flushInterval,
        enableLocalStorage: settings.enableLocalStorage,
        maxLocalEntries: settings.maxLocalEntries
      });

      // Initialize Sentry if enabled
      if (settings.enableSentry && settings.sentryDsn) {
        await initializeSentry(settings);
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración de logging se ha actualizado correctamente.",
      });

      logger.info('Logging configuration updated', 'LoggingConfig', settings);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
      logger.error('Failed to save logging configuration', error as Error, 'LoggingConfig');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSentry = async (config: LoggingSettings) => {
    // This would initialize Sentry with the provided configuration
    // For now, we'll just log the configuration
    logger.info('Sentry configuration would be initialized', 'LoggingConfig', {
      dsn: config.sentryDsn,
      environment: config.environment,
      release: config.release
    });
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      if (settings.enableRemote && settings.remoteEndpoint) {
        const response = await fetch(settings.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` })
          },
          body: JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Test connection from TeeTime Concierge'
          })
        });

        if (response.ok) {
          setTestResult({ success: true, message: 'Conexión exitosa al endpoint remoto' });
        } else {
          setTestResult({ success: false, message: `Error HTTP ${response.status}: ${response.statusText}` });
        }
      } else {
        setTestResult({ success: false, message: 'Endpoint remoto no configurado' });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Error de conexión: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    logger.clearStoredLogs();
    toast({
      title: "Logs eliminados",
      description: "Todos los logs almacenados localmente han sido eliminados.",
    });
  };

  const exportLogs = () => {
    const logs = logger.getStoredLogs();
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs exportados",
      description: "Los logs han sido descargados como archivo JSON.",
    });
  };

  const updateSetting = <K extends keyof LoggingSettings>(key: K, value: LoggingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Logging
          </CardTitle>
          <CardDescription>
            Configura el sistema de logging y monitoreo de errores para la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="remote">Remoto</TabsTrigger>
              <TabsTrigger value="sentry">Sentry</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Nivel de Log</Label>
                  <Select 
                    value={settings.level.toString()} 
                    onValueChange={(value) => updateSetting('level', parseInt(value) as LogLevel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">DEBUG</SelectItem>
                      <SelectItem value="1">INFO</SelectItem>
                      <SelectItem value="2">WARN</SelectItem>
                      <SelectItem value="3">ERROR</SelectItem>
                      <SelectItem value="4">FATAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Entorno</Label>
                  <Select 
                    value={settings.environment} 
                    onValueChange={(value) => updateSetting('environment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Logging en Consola</Label>
                    <p className="text-sm text-muted-foreground">Mostrar logs en la consola del navegador</p>
                  </div>
                  <Switch 
                    checked={settings.enableConsole} 
                    onCheckedChange={(checked) => updateSetting('enableConsole', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Almacenamiento Local</Label>
                    <p className="text-sm text-muted-foreground">Guardar logs en localStorage</p>
                  </div>
                  <Switch 
                    checked={settings.enableLocalStorage} 
                    onCheckedChange={(checked) => updateSetting('enableLocalStorage', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bufferSize">Tamaño del Buffer</Label>
                  <Input
                    id="bufferSize"
                    type="number"
                    value={settings.bufferSize}
                    onChange={(e) => updateSetting('bufferSize', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flushInterval">Intervalo de Flush (ms)</Label>
                  <Input
                    id="flushInterval"
                    type="number"
                    value={settings.flushInterval}
                    onChange={(e) => updateSetting('flushInterval', parseInt(e.target.value))}
                    min="1000"
                    max="300000"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="remote" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Logging Remoto</Label>
                  <p className="text-sm text-muted-foreground">Enviar logs a un servicio externo</p>
                </div>
                <Switch 
                  checked={settings.enableRemote} 
                  onCheckedChange={(checked) => updateSetting('enableRemote', checked)}
                />
              </div>

              {settings.enableRemote && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="remoteEndpoint">Endpoint Remoto</Label>
                    <Input
                      id="remoteEndpoint"
                      type="url"
                      placeholder="https://api.ejemplo.com/logs"
                      value={settings.remoteEndpoint}
                      onChange={(e) => updateSetting('remoteEndpoint', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Tu API key"
                      value={settings.apiKey}
                      onChange={(e) => updateSetting('apiKey', e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={testConnection} 
                    disabled={isLoading || !settings.remoteEndpoint}
                    variant="outline"
                    className="w-full"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {isLoading ? 'Probando...' : 'Probar Conexión'}
                  </Button>

                  {testResult && (
                    <Alert variant={testResult.success ? "default" : "destructive"}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sentry" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Integración con Sentry</Label>
                  <p className="text-sm text-muted-foreground">Monitoreo avanzado de errores con Sentry</p>
                </div>
                <Switch 
                  checked={settings.enableSentry || false} 
                  onCheckedChange={(checked) => updateSetting('enableSentry', checked)}
                />
              </div>

              {settings.enableSentry && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sentryDsn">Sentry DSN</Label>
                    <Input
                      id="sentryDsn"
                      type="url"
                      placeholder="https://xxx@xxx.ingest.sentry.io/xxx"
                      value={settings.sentryDsn || ''}
                      onChange={(e) => updateSetting('sentryDsn', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="release">Release Version</Label>
                    <Input
                      id="release"
                      placeholder="1.0.0"
                      value={settings.release || ''}
                      onChange={(e) => updateSetting('release', e.target.value)}
                    />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Para usar Sentry, necesitas instalar el SDK: <code>npm install @sentry/nextjs</code>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Logs Almacenados</h4>
                    <p className="text-sm text-muted-foreground">
                      {logger.getStoredLogs().length} entradas en localStorage
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportLogs} variant="outline" size="sm">
                      <Database className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                    <Button onClick={clearLogs} variant="destructive" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="maxLocalEntries">Máximo de Entradas Locales</Label>
                  <Input
                    id="maxLocalEntries"
                    type="number"
                    value={settings.maxLocalEntries}
                    onChange={(e) => updateSetting('maxLocalEntries', parseInt(e.target.value))}
                    min="100"
                    max="10000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de logs a mantener en localStorage
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}