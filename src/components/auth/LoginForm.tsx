
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { useStableNavigation } from "@/hooks/useStableNavigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useErrorHandler, commonValidators } from "@/hooks/useErrorHandler"
import { ValidationError } from "@/lib/error-handling"
import { FirebaseError } from "firebase/app"
import { Loader2 } from "lucide-react"
import { handleError, translateFirebaseError } from "@/lib/error-handling"
import { getFriendlyErrorMessage } from "@/lib/auth-utils"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).max(254, { message: "Email is too long." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).max(128, { message: "Password is too long." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const { login, googleSignIn, resetPassword } = useAuth()
  const { handleAsyncError } = useErrorHandler()
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname?.split('/')[1] || 'en'
  const { go } = useStableNavigation()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    handleAsyncError(async () => {
      console.log('Starting login process...');
      
      // Validación adicional de datos
      if (!commonValidators.isValidEmail(values.email)) {
        throw new ValidationError('Please enter a valid email address');
      }
      
      if (values.password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }
      
      await login(values.email.trim().toLowerCase(), values.password);
      console.log('Login successful');
      
      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Has iniciado sesión correctamente.",
      });
      
      go(`/${lang}/profile`);
    }, {
      onError: async (error: any) => {
        // Usar mensajes de error amigables
        const friendlyMessage = getFriendlyErrorMessage(error.code);
        
        toast({
          title: "Error al iniciar sesión",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        throw error; // Relanzar para que useErrorHandler lo maneje
      }
    });
  }

  function handleGoogleSignIn() {
    handleAsyncError(async () => {
      console.log('Starting Google sign-in...');
      
      await googleSignIn();
      console.log('Google sign-in successful');
      
      toast({
        title: "¡Bienvenido a TeeReserve!",
        description: "Has iniciado sesión correctamente.",
      });
      
      go(`/${lang}/profile`);
    }, {
      onError: async (error: any) => {
        // Usar mensajes de error amigables
        const friendlyMessage = getFriendlyErrorMessage(error.code);
        
        toast({
          title: "Error al iniciar sesión",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        throw error; // Relanzar para que useErrorHandler lo maneje
      }
    });
  }

  function handlePasswordReset() {
    handleAsyncError(async () => {
      if (!resetEmail) {
        throw new ValidationError('Por favor ingresa tu email');
      }
      
      if (!commonValidators.isValidEmail(resetEmail)) {
        throw new ValidationError('Please enter a valid email address');
      }
      
      console.log('Sending password reset email...');
      setIsResetting(true);
      
      await resetPassword(resetEmail.trim().toLowerCase());
      console.log('Password reset email sent successfully');
      
      toast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
      setIsResetting(false);
    });
  }


  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Logging In...' : 'Log In'}
            </Button>
            
            <div className="text-center">
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                    ¿Olvidaste tu contraseña?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Restablecer contraseña</DialogTitle>
                    <DialogDescription>
                      Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setIsResetDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handlePasswordReset}
                        disabled={isResetting}
                      >
                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isResetting ? 'Enviando...' : 'Enviar enlace'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR CONTINUE WITH</span>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full">
            <Button variant="outline" onClick={handleGoogleSignIn}>Google</Button>
        </div>
      </CardFooter>
    </Card>
  )
}
