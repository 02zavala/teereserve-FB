"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export function GoogleAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { googleSignIn } = useAuth();

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleAuthRedirect = async () => {
    setIsLoading(true);
    setDebugInfo([]);
    
    try {
      addDebugInfo('Iniciando Google Auth con redirect...');
      
      if (!auth) {
        addDebugInfo('ERROR: Firebase auth no está disponible');
        return;
      }
      
      addDebugInfo('Firebase auth disponible');
      addDebugInfo('Llamando a googleSignIn()...');
      
      await googleSignIn();
      addDebugInfo('googleSignIn() completado - redirigiendo...');
      
    } catch (error: any) {
      addDebugInfo(`ERROR en googleSignIn(): ${error.message}`);
      addDebugInfo(`Código de error: ${error.code}`);
      addDebugInfo(`Stack: ${error.stack}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGoogleAuthPopup = async () => {
    setIsLoading(true);
    setDebugInfo([]);
    
    try {
      addDebugInfo('Iniciando Google Auth con popup...');
      
      if (!auth) {
        addDebugInfo('ERROR: Firebase auth no está disponible');
        return;
      }
      
      addDebugInfo('Firebase auth disponible');
      
      const provider = new GoogleAuthProvider();
      addDebugInfo('GoogleAuthProvider creado');
      
      addDebugInfo('Llamando a signInWithPopup...');
      const result = await signInWithPopup(auth, provider);
      
      addDebugInfo(`Popup exitoso! Usuario: ${result.user.email}`);
      addDebugInfo(`Display Name: ${result.user.displayName}`);
      addDebugInfo(`UID: ${result.user.uid}`);
      
    } catch (error: any) {
      addDebugInfo(`ERROR en popup: ${error.message}`);
      addDebugInfo(`Código de error: ${error.code}`);
      
      if (error.code === 'auth/popup-blocked') {
        addDebugInfo('El popup fue bloqueado por el navegador');
      } else if (error.code === 'auth/popup-closed-by-user') {
        addDebugInfo('El usuario cerró el popup');
      } else if (error.code === 'auth/cancelled-popup-request') {
        addDebugInfo('Solicitud de popup cancelada');
      }
      
      addDebugInfo(`Stack: ${error.stack}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFirebaseConfig = () => {
    setDebugInfo([]);
    
    addDebugInfo('=== VERIFICACIÓN DE CONFIGURACIÓN ===');
    
    // Verificar variables de entorno
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    addDebugInfo(`API Key: ${apiKey ? 'Configurada' : 'NO CONFIGURADA'}`);
    addDebugInfo(`Auth Domain: ${authDomain ? 'Configurada' : 'NO CONFIGURADA'}`);
    addDebugInfo(`Project ID: ${projectId ? 'Configurada' : 'NO CONFIGURADA'}`);
    
    if (apiKey && apiKey.includes('placeholder')) {
      addDebugInfo('WARNING: API Key contiene "placeholder"');
    }
    
    // Verificar Firebase Auth
    addDebugInfo(`Firebase Auth: ${auth ? 'Inicializado' : 'NO INICIALIZADO'}`);
    
    if (auth) {
      addDebugInfo(`Auth App: ${auth.app.name}`);
      addDebugInfo(`Auth Config: ${auth.config.apiKey ? 'API Key OK' : 'API Key MISSING'}`);
      addDebugInfo(`Current User: ${auth.currentUser ? auth.currentUser.email : 'No autenticado'}`);
    }
    
    // Verificar Google OAuth específicamente
    addDebugInfo('=== VERIFICACIÓN DE GOOGLE OAUTH ===');
    try {
      const provider = new GoogleAuthProvider();
      addDebugInfo('GoogleAuthProvider: Creado exitosamente');
      addDebugInfo(`Provider ID: ${provider.providerId}`);
    } catch (error: any) {
      addDebugInfo(`ERROR creando GoogleAuthProvider: ${error.message}`);
    }
    
    // Verificar conectividad a Google APIs
    addDebugInfo('=== VERIFICACIÓN DE CONECTIVIDAD ===');
    addDebugInfo(`Navigator Online: ${navigator.onLine ? 'Sí' : 'No'}`);
    addDebugInfo(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);
    
    // Verificar si hay bloqueadores de popup
    addDebugInfo('=== VERIFICACIÓN DE POPUP ===');
    try {
      const testPopup = window.open('', '_blank', 'width=1,height=1');
      if (testPopup) {
        testPopup.close();
        addDebugInfo('Popup Test: PERMITIDO');
      } else {
        addDebugInfo('Popup Test: BLOQUEADO - Habilita popups para localhost');
      }
    } catch (error: any) {
      addDebugInfo(`Popup Test ERROR: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Google Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkFirebaseConfig} variant="outline">
            Verificar Configuración
          </Button>
          <Button 
            onClick={testGoogleAuthRedirect} 
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Probando...' : 'Probar Redirect'}
          </Button>
          <Button 
            onClick={testGoogleAuthPopup} 
            disabled={isLoading}
            variant="secondary"
          >
            {isLoading ? 'Probando...' : 'Probar Popup'}
          </Button>
          <Button 
            onClick={() => setDebugInfo([])} 
            variant="destructive"
          >
            Limpiar
          </Button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          {debugInfo.length === 0 ? (
            <p className="text-gray-500">Haz clic en un botón para comenzar el debug...</p>
          ) : (
            <div className="space-y-1">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm font-mono">
                  {info}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}