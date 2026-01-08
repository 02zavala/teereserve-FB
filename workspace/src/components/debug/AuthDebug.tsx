"use client";

import { useState, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function AuthDebugComponent() {
  const { user, login, signup } = useAuth();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('TestPassword123!');
  const [testName, setTestName] = useState('Usuario Test');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setUserExists(null);
  }, []);

  const checkUserExists = useCallback(async () => {
    setIsLoading(true);
    addLog('🔍 Verificando si el usuario existe...');
    
    try {
      if (!db) {
        addLog('❌ Firestore no está disponible');
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', testEmail));
      const querySnapshot = await getDocs(q);
      
      const exists = !querySnapshot.empty;
      setUserExists(exists);
      
      if (exists) {
        addLog('✅ Usuario encontrado en Firestore');
        querySnapshot.forEach(doc => {
          const userData = doc.data();
          addLog(`📋 Datos del usuario: ${JSON.stringify(userData, null, 2)}`);
        });
      } else {
        addLog('❌ Usuario NO encontrado en Firestore');
      }
    } catch (error: any) {
      addLog(`❌ Error verificando usuario: ${error.message}`);
      setUserExists(false);
    } finally {
      setIsLoading(false);
    }
  }, [testEmail, addLog]);

  const testCreateUser = useCallback(async () => {
    setIsLoading(true);
    addLog('🚀 Intentando crear usuario de prueba...');
    
    try {
      const result = await signup(testEmail, testPassword, testName, 15);
      addLog('✅ Usuario creado exitosamente!');
      addLog(`📋 UID: ${result.user?.uid}`);
      addLog(`📧 Email: ${result.user?.email}`);
      addLog(`👤 Display Name: ${result.user?.displayName}`);
      setUserExists(true);
    } catch (error: any) {
      addLog(`❌ Error creando usuario: ${error.code} - ${error.message}`);
      
      if (error.code === 'auth/email-already-in-use') {
        addLog('📝 El email ya está en uso. Intentando login...');
        // Evitar llamada recursiva, mejor manejar por separado
      }
    } finally {
      setIsLoading(false);
    }
  }, [testEmail, testPassword, testName, signup, addLog]);

  const testLogin = useCallback(async () => {
    setIsLoading(true);
    addLog('🔑 Intentando login...');
    
    try {
      const result = await login(testEmail, testPassword);
      addLog('✅ Login exitoso!');
      addLog(`📋 UID: ${result.user?.uid}`);
      addLog(`📧 Email: ${result.user?.email}`);
      addLog(`👤 Display Name: ${result.user?.displayName}`);
    } catch (error: any) {
      addLog(`❌ Error en login: ${error.code} - ${error.message}`);
      
      switch (error.code) {
        case 'auth/invalid-credential':
          addLog('📝 Credenciales inválidas - usuario no existe o contraseña incorrecta');
          break;
        case 'auth/user-not-found':
          addLog('📝 Usuario no encontrado');
          break;
        case 'auth/wrong-password':
          addLog('📝 Contraseña incorrecta');
          break;
        case 'auth/too-many-requests':
          addLog('📝 Demasiados intentos fallidos - cuenta temporalmente bloqueada');
          break;
        default:
          addLog(`📝 Error desconocido: ${error.code}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [testEmail, testPassword, login, addLog]);

  const testDirectFirebaseAuth = useCallback(async () => {
    setIsLoading(true);
    addLog('🔧 Probando Firebase Auth directamente...');
    
    try {
      if (!auth) {
        addLog('❌ Firebase Auth no está disponible');
        return;
      }

      addLog('📧 Intentando crear usuario directamente con Firebase...');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      addLog('✅ Usuario creado directamente!');
      addLog(`📋 UID: ${userCredential.user.uid}`);
      
      // Intentar login inmediatamente
      addLog('🔑 Intentando login directo...');
      const loginResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      addLog('✅ Login directo exitoso!');
      
    } catch (error: any) {
      addLog(`❌ Error en Firebase directo: ${error.code} - ${error.message}`);
      
      if (error.code === 'auth/email-already-in-use') {
        addLog('📝 Usuario ya existe, intentando login directo...');
        try {
          if (!auth) {
            addLog('❌ Auth no está disponible');
            return;
          }
          const loginResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          addLog('✅ Login directo exitoso con usuario existente!');
        } catch (loginError: any) {
          addLog(`❌ Error en login directo: ${loginError.code} - ${loginError.message}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [testEmail, testPassword, addLog]);

  // Memoizar el estado del usuario para evitar re-renders
  const userStatus = useMemo(() => {
    return user ? `Logueado como ${user.email}` : 'No logueado';
  }, [user?.email]);

  // Memoizar los logs para evitar re-renders innecesarios
  const logsDisplay = useMemo(() => {
    return logs.join('\n');
  }, [logs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Debug de Autenticación Firebase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado actual */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Estado actual:</strong> {userStatus}
            </AlertDescription>
          </Alert>

          {/* Configuración de prueba */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Email de prueba:</label>
              <Input 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña:</label>
              <Input 
                type="password"
                value={testPassword} 
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="TestPassword123!"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre:</label>
              <Input 
                value={testName} 
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Usuario Test"
              />
            </div>
          </div>

          {/* Botones de prueba */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={checkUserExists} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verificar Usuario
            </Button>
            
            <Button 
              onClick={testCreateUser} 
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear Usuario
            </Button>
            
            <Button 
              onClick={testLogin} 
              disabled={isLoading}
              variant="secondary"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Probar Login
            </Button>
            
            <Button 
              onClick={testDirectFirebaseAuth} 
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Directo
            </Button>
            
            <Button 
              onClick={clearLogs} 
              disabled={isLoading}
              variant="ghost"
            >
              Limpiar Logs
            </Button>
          </div>

          {/* Estado del usuario */}
          {userExists !== null && (
            <Alert>
              {userExists ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                Usuario {userExists ? 'EXISTE' : 'NO EXISTE'} en Firestore
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Logs de Debug:</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md max-h-64 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {logsDisplay}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Información de Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>🔧 Firebase Config:</strong> ✅ Correcta</p>
            <p><strong>🔑 Auth Domain:</strong> teereserve-golf.firebaseapp.com</p>
            <p><strong>📦 Project ID:</strong> teereserve-golf</p>
            <p><strong>⚠️ Error común:</strong> auth/invalid-credential = usuario no existe o contraseña incorrecta</p>
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Solución recomendada:</strong> Si el error persiste, crear un nuevo usuario con el botón "Crear Usuario" 
              o verificar que el usuario existe en Firebase Console {'>'}  Authentication {'>'} Users.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

// Exportar componente memoizado para evitar re-renders innecesarios
export const AuthDebug = memo(AuthDebugComponent);
