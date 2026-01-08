
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { auth, db } from '@/lib/firebase'

export function SignUpDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { signup } = useAuth()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[SignUpDebug] ${message}`)
  }

  const testSignUp = async () => {
    setIsLoading(true)
    setLogs([])
    
    try {
      addLog('🔍 Iniciando proceso de debug de registro')
      
      // Verificar configuración de Firebase
      addLog(`🔧 Firebase Auth disponible: ${auth ? 'Sí' : 'No'}`)
      addLog(`🔧 Firestore disponible: ${db ? 'Sí' : 'No'}`)
      
      if (!auth) {
        addLog('❌ ERROR: Firebase Auth no está inicializado')
        return
      }
      
      if (!db) {
        addLog('❌ ERROR: Firestore no está inicializado')
        return
      }
      
      // Datos de prueba
      const testData = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Usuario Test',
        handicap: 15
      }
      
      addLog(`📧 Email de prueba: ${testData.email}`)
      addLog(`👤 Nombre: ${testData.name}`)
      addLog(`⛳ Handicap: ${testData.handicap}`)
      
      addLog('🚀 Llamando a función signup...')
      
      const result = await signup(
        testData.email,
        testData.password,
        testData.name,
        testData.handicap
      )
      
      addLog(`✅ Signup exitoso! UID: ${result?.user?.uid}`)
      addLog(`📧 Email verificado: ${result?.user?.emailVerified}`)
      addLog(`👤 Display Name: ${result?.user?.displayName}`)
      
    } catch (error: any) {
      addLog(`❌ ERROR en signup: ${error.message}`)
      addLog(`🔍 Código de error: ${error.code || 'N/A'}`)
      addLog(`🔍 Stack trace: ${error.stack || 'N/A'}`)
      
      // Errores específicos de Firebase
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            addLog('📝 El email ya está en uso')
            break
          case 'auth/weak-password':
            addLog('📝 La contraseña es muy débil')
            break
          case 'auth/invalid-email':
            addLog('📝 El email no es válido')
            break
          case 'auth/operation-not-allowed':
            addLog('📝 La operación no está permitida')
            break
          default:
            addLog(`📝 Error desconocido: ${error.code}`)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Debug de Registro de Usuario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testSignUp} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? '⏳ Probando...' : '🧪 Probar Registro'}
          </Button>
          <Button 
            onClick={clearLogs} 
            variant="outline"
            disabled={isLoading}
          >
            🗑️ Limpiar
          </Button>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2">📋 Logs de Debug:</h3>
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No hay logs aún. Haz clic en "Probar Registro" para comenzar.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Instrucciones:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Haz clic en "Probar Registro" para ejecutar un test de registro</li>
            <li>Observa los logs para identificar dónde falla el proceso</li>
            <li>También revisa la consola del navegador (F12) para más detalles</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
