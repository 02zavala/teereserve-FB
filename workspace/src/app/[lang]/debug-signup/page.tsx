
import { SignUpDebug } from '@/components/debug/SignUpDebug'

export default function DebugSignUpPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          🔧 Debug de Registro de Usuario
        </h1>
        <p className="text-muted-foreground">
          Esta página te ayudará a diagnosticar problemas con el registro de usuarios.
        </p>
      </div>
      
      <SignUpDebug />
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          💡 <strong>Tip:</strong> Abre las herramientas de desarrollador (F12) y ve a la pestaña Console para ver logs adicionales.
        </p>
      </div>
    </div>
  )
}
