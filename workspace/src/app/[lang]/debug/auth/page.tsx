import { AuthDebug } from '@/components/debug/AuthDebug';

export default function AuthDebugPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 Debug de Autenticación</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Herramienta de diagnóstico para resolver problemas de autenticación Firebase.
          </p>
        </div>
        
        <AuthDebug />
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">📚 Guía de Uso</h2>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>• <strong>Verificar Usuario:</strong> Comprueba si el email existe en Firestore</li>
            <li>• <strong>Crear Usuario:</strong> Crea un nuevo usuario de prueba</li>
            <li>• <strong>Probar Login:</strong> Intenta hacer login con las credenciales</li>
            <li>• <strong>Test Directo:</strong> Prueba Firebase Auth sin el contexto de la app</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
